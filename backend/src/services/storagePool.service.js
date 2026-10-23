/**
 * Cloudinary storage pool (PRD 10.13, STO-2/3/4):
 * - keeps one StorageAccount document per account in CLOUDINARY_ACCOUNTS
 * - picks the active account with the most free space in the right pool
 *   (Official or Community; "shared" accounts serve both)
 * - skips accounts that are full (85% of their quota) or paused
 * - tracks usage: estimated on every upload, corrected by a sync every 6 h
 * - emails the Owner when a pool has no space left
 * Without the Cloudinary pool (local / S3 storage) every function is a no-op.
 */
import { env } from "../config/env.js";
import { StorageAccount } from "../models/storageAccount.model.js";
import { Track } from "../models/track.model.js";
import { User } from "../models/user.model.js";
import { usesStoragePool } from "./storage/index.js";
import { fetchCloudinaryUsage } from "./storage/cloudinary.driver.js";
import { sendEmail } from "./email.service.js";
import { storageFullEmail } from "../utils/emailTemplates.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES, STORAGE_FULL_PERCENT } from "../config/constants.js";
import { logger } from "../utils/logger.js";

const FULL_ALERT_EVERY_MS = 6 * 60 * 60 * 1000; // at most one "pool full" email per pool every 6 h
const lastFullAlertAt = new Map();
let accountsReady = null;

/**
 * Whether usage has reached the "full" line.
 * @param {number} bytesUsed
 * @param {number} quotaBytes
 * @param {number|null} [creditsUsedPercent] - Cloudinary's own plan usage, when known
 * @returns {boolean}
 */
export function isOverFullLine(bytesUsed, quotaBytes, creditsUsedPercent = null) {
  const storagePercent = (bytesUsed / quotaBytes) * 100;
  return (
    storagePercent >= STORAGE_FULL_PERCENT || (creditsUsedPercent ?? 0) >= STORAGE_FULL_PERCENT
  );
}

/**
 * Choose the account for a new upload (pure — unit tested).
 * @param {Array<{ key: string, pool: string, status: string, quotaBytes: number, bytesUsed: number }>} accounts
 * @param {"official"|"community"} pool
 * @returns {Object|null} The active, not-full account with the most free space
 */
export function chooseAccount(accounts, pool) {
  return (
    accounts
      .filter((account) => account.pool === pool || account.pool === "shared")
      .filter((account) => account.status === "active")
      .filter((account) => !isOverFullLine(account.bytesUsed, account.quotaBytes))
      .sort((a, b) => b.quotaBytes - b.bytesUsed - (a.quotaBytes - a.bytesUsed))[0] ?? null
  );
}

/**
 * Create / update the StorageAccount documents from CLOUDINARY_ACCOUNTS
 * (once per process; adding an account needs no code change — STO-2).
 * @returns {Promise<void>}
 */
export function ensureStorageAccounts() {
  accountsReady ??= Promise.all(
    env.storage.cloudinaryAccounts.map((account) =>
      StorageAccount.updateOne(
        { key: account.key },
        {
          $set: { pool: account.pool, quotaBytes: account.quotaBytes },
          $setOnInsert: { status: "active" },
        },
        { upsert: true }
      )
    )
  ).catch((error) => {
    accountsReady = null; // try again next time
    throw error;
  });
  return accountsReady;
}

/**
 * Email the Owner that a pool is full (throttled).
 * @param {string} pool
 * @returns {Promise<void>}
 */
async function alertOwnerPoolFull(pool) {
  const last = lastFullAlertAt.get(pool) ?? 0;
  if (Date.now() - last < FULL_ALERT_EVERY_MS) return;
  lastFullAlertAt.set(pool, Date.now());
  const owner = await User.findOne({ staffRole: "owner" }).select("name email").lean();
  if (!owner) return;
  await sendEmail({
    to: owner.email,
    ...storageFullEmail({ name: owner.name, pool, consoleUrl: `${env.appUrl}/admin` }),
  }).catch((error) => logger.error(`[StoragePool] full-pool alert email failed: ${error.message}`));
}

/**
 * Pick the account a new upload goes to.
 * @param {"official"|"community"} pool
 * @returns {Promise<string|null>} Account key, or null when the pool is not used
 * @throws {ApiError} 503 STORAGE_FULL when no account in the pool has space (Owner is alerted)
 */
export async function pickStorageAccount(pool) {
  if (!usesStoragePool) return null;
  await ensureStorageAccounts();
  const accounts = await StorageAccount.find({
    key: { $in: env.storage.cloudinaryAccounts.map((a) => a.key) },
  }).lean();
  const account = chooseAccount(accounts, pool);
  if (!account) {
    logger.warn(`[StoragePool] no space left in the ${pool} pool`);
    alertOwnerPoolFull(pool);
    throw new ApiError(
      503,
      "Uploads are paused because storage is full. Our team has been notified — please try again later.",
      {
        code: ERROR_CODES.STORAGE_FULL,
      }
    );
  }
  return account.key;
}

/**
 * Add stored bytes / songs to an account between syncs (PRD 10.13 step 4).
 * Marks the account full as soon as it crosses the line.
 * @param {string|null} accountKey
 * @param {{ bytes?: number, songs?: number }} change
 * @returns {Promise<void>}
 */
export async function recordStorageUsage(accountKey, { bytes = 0, songs = 0 }) {
  if (!accountKey || !usesStoragePool) return;
  const account = await StorageAccount.findOneAndUpdate(
    { key: accountKey },
    { $inc: { bytesUsed: bytes, songCount: songs } },
    { returnDocument: "after" }
  );
  if (
    account &&
    account.status === "active" &&
    isOverFullLine(account.bytesUsed, account.quotaBytes)
  ) {
    account.status = "full";
    await account.save();
    logger.warn(`[StoragePool] account ${accountKey} is now full — new uploads go elsewhere`);
  }
}

/**
 * Background job (every 6 h): read real usage from Cloudinary, count songs,
 * and mark accounts full / active again (paused accounts stay paused).
 * @returns {Promise<void>}
 */
export async function syncStorageUsageJob() {
  if (!usesStoragePool) return;
  await ensureStorageAccounts();
  for (const { key } of env.storage.cloudinaryAccounts) {
    const account = await StorageAccount.findOne({ key });
    try {
      const usage = await fetchCloudinaryUsage(key);
      account.bytesUsed = usage.bytesUsed;
      account.bandwidthBytes = usage.bandwidthBytes;
      account.songCount = await Track.countDocuments({ "storage.accountKey": key });
      if (account.status !== "paused") {
        account.status = isOverFullLine(
          usage.bytesUsed,
          account.quotaBytes,
          usage.creditsUsedPercent
        )
          ? "full"
          : "active";
      }
      account.lastSyncError = null;
    } catch (error) {
      account.lastSyncError = error.message;
      logger.error(`[StoragePool] usage sync for ${key} failed: ${error.message}`);
    }
    account.lastSyncAt = new Date();
    await account.save();
  }
  logger.debug("[StoragePool] usage synced");
}
