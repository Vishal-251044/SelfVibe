/**
 * Admin Storage (PRD STO-3/5, roadmap Day 9): usage per Cloudinary account,
 * songs per account, pause / resume, sync now, and moving songs between
 * accounts in the same pool (a background job per song: copy every file of
 * the song to the new account, switch the song over, then delete the old copies).
 */
import path from "node:path";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { env } from "../../config/env.js";
import { StorageAccount } from "../../models/storageAccount.model.js";
import { Track } from "../../models/track.model.js";
import { storage, usesStoragePool } from "../storage/index.js";
import { splitAccountKey, withAccount } from "../storage/storageKeys.js";
import {
  ensureStorageAccounts,
  recordStorageUsage,
  syncStorageUsageJob,
} from "../storagePool.service.js";
import { queue } from "../queue/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { ERROR_CODES, JOBS, STORAGE_FULL_PERCENT } from "../../config/constants.js";
import { logger } from "../../utils/logger.js";

const MOVE_MAX_TRACKS = 200;
const CONTENT_TYPES = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  m4a: "audio/mp4",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Staff view of one account (secrets never leave env).
 * @param {Object} account - Lean StorageAccount
 * @param {number} liveSongs - Songs that point at this account right now
 * @returns {Object}
 */
function toAccountView(account, liveSongs) {
  const usedPercent = account.quotaBytes > 0 ? (account.bytesUsed / account.quotaBytes) * 100 : 0;
  return {
    key: account.key,
    pool: account.pool,
    status: account.status,
    quotaBytes: account.quotaBytes,
    bytesUsed: account.bytesUsed,
    bandwidthBytes: account.bandwidthBytes,
    usedPercent: Math.round(usedPercent * 10) / 10,
    nearlyFull: usedPercent >= STORAGE_FULL_PERCENT - 10,
    songCount: liveSongs,
    lastSyncAt: account.lastSyncAt,
    lastSyncError: account.lastSyncError,
  };
}

/**
 * Every pool account with usage. Without the Cloudinary pool (local / S3
 * storage) the list is empty and `driver` says what is used instead.
 * @returns {Promise<{ driver: string, usesPool: boolean, fullPercent: number, accounts: Object[] }>}
 */
export async function listStorageAccounts() {
  if (!usesStoragePool) {
    return {
      driver: env.storage.driver || "local",
      usesPool: false,
      fullPercent: STORAGE_FULL_PERCENT,
      accounts: [],
    };
  }
  await ensureStorageAccounts();
  const keys = env.storage.cloudinaryAccounts.map((account) => account.key);
  const [accounts, counts] = await Promise.all([
    StorageAccount.find({ key: { $in: keys } })
      .sort({ pool: 1, key: 1 })
      .lean(),
    Track.aggregate([
      { $match: { "storage.accountKey": { $in: keys } } },
      { $group: { _id: "$storage.accountKey", count: { $sum: 1 } } },
    ]),
  ]);
  const songs = new Map(counts.map((row) => [row._id, row.count]));
  return {
    driver: "cloudinary",
    usesPool: true,
    fullPercent: STORAGE_FULL_PERCENT,
    accounts: accounts.map((account) => toAccountView(account, songs.get(account.key) ?? 0)),
  };
}

/**
 * Find a configured account or 404.
 * @param {string} key
 * @returns {Promise<Object>}
 */
async function requireAccount(key) {
  if (!usesStoragePool || !env.storage.cloudinaryAccounts.some((account) => account.key === key)) {
    throw ApiError.notFound(`No storage account "${key}"`, { code: ERROR_CODES.NOT_FOUND });
  }
  await ensureStorageAccounts();
  return StorageAccount.findOne({ key });
}

/**
 * Pause an account (no new uploads) or resume it.
 * @param {string} key
 * @param {"paused"|"active"} status
 * @returns {Promise<{ before: string, account: Object }>}
 */
export async function setAccountStatus(key, status) {
  const account = await requireAccount(key);
  const before = account.status;
  // Resuming a full account keeps it full; the next sync decides
  account.status =
    status === "paused"
      ? "paused"
      : (account.bytesUsed / account.quotaBytes) * 100 >= STORAGE_FULL_PERCENT
        ? "full"
        : "active";
  await account.save();
  const songs = await Track.countDocuments({ "storage.accountKey": key });
  logger.info(`[AdminStorage] account ${key}: ${before} → ${account.status}`);
  return { before, account: toAccountView(account.toObject(), songs) };
}

/**
 * Read real usage from Cloudinary now (normally every 6 h).
 * @returns {Promise<Object>} The refreshed list
 */
export async function syncNow() {
  await syncStorageUsageJob();
  return listStorageAccounts();
}

/**
 * Queue moving songs from one account to another in the same pool.
 * @param {{ fromKey: string, toKey: string, trackIds?: string[], limit?: number }} input
 * @returns {Promise<{ queued: number, trackIds: string[] }>}
 * @throws {ApiError} 400 for the same account, different pools or a paused target
 */
export async function queueMove({ fromKey, toKey, trackIds, limit = 50 }) {
  if (fromKey === toKey) throw ApiError.badRequest("Choose two different accounts");
  const [from, to] = await Promise.all([requireAccount(fromKey), requireAccount(toKey)]);
  if (from.pool !== to.pool) {
    throw ApiError.badRequest("Songs can only move within the same pool (Official or Community)");
  }
  if (to.status !== "active")
    throw ApiError.badRequest(`Account ${toKey} is ${to.status} — pick an active one`);

  const filter = {
    "storage.accountKey": fromKey,
    ...(trackIds?.length && { _id: { $in: trackIds } }),
  };
  const tracks = await Track.find(filter)
    .select("_id")
    .limit(Math.min(limit, MOVE_MAX_TRACKS))
    .lean();
  for (const track of tracks) {
    await queue.enqueue(
      JOBS.moveTrackStorage,
      { trackId: String(track._id), toKey },
      { attempts: 3 }
    );
  }
  logger.info(`[AdminStorage] queued ${tracks.length} song move(s) ${fromKey} → ${toKey}`);
  return { queued: tracks.length, trackIds: tracks.map((track) => String(track._id)) };
}

/**
 * Background job: move one song's files to another account.
 * @param {{ data: { trackId: string, toKey: string } }} job
 * @returns {Promise<void>}
 */
export async function moveTrackStorageJob({ data }) {
  const { trackId, toKey } = data;
  const track = await Track.findById(trackId);
  const fromKey = track?.storage?.accountKey;
  if (!track || !fromKey || fromKey === toKey) return;

  // Every file of the song that lives on the old account
  const fields = [
    ["audio.sourceKey", track.audio?.sourceKey],
    ...(track.audio?.formats ?? []).map((format, index) => [
      `audio.formats.${index}.key`,
      format.key,
    ]),
    ["coverKey", track.coverKey],
  ].filter(([, key]) => key && splitAccountKey(key).accountKey === fromKey);

  const workDir = await mkdtemp(path.join(os.tmpdir(), "sv-move-"));
  const moved = [];
  try {
    for (const [field, key] of fields) {
      const { path: inside } = splitAccountKey(key);
      const newKey = withAccount(toKey, inside);
      const localPath = path.join(workDir, path.basename(inside));
      await storage.getToFile(key, localPath);
      const extension = path.extname(inside).slice(1).toLowerCase();
      await storage.putFile(
        localPath,
        newKey,
        CONTENT_TYPES[extension] ?? "application/octet-stream"
      );
      moved.push({ field, oldKey: key, newKey });
    }
    const update = { "storage.accountKey": toKey };
    for (const { field, newKey } of moved) update[field] = newKey;
    const cover = moved.find((entry) => entry.field === "coverKey");
    if (cover) update.coverUrl = storage.publicUrl(cover.newKey);
    await Track.updateOne({ _id: trackId }, { $set: update });
  } catch (error) {
    // Undo half-finished copies; the song still points at the old account
    await storage.remove(moved.map((entry) => entry.newKey)).catch(() => {});
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  await storage
    .remove(moved.map((entry) => entry.oldKey))
    .catch((error) =>
      logger.warn(`[AdminStorage] old files of ${trackId} not deleted: ${error.message}`)
    );
  const bytes = track.storage?.bytes ?? 0;
  await recordStorageUsage(fromKey, { bytes: -bytes, songs: -1 });
  await recordStorageUsage(toKey, { bytes, songs: 1 });
  logger.info(
    `[AdminStorage] moved track ${trackId} (${moved.length} files) ${fromKey} → ${toKey}`
  );
}
