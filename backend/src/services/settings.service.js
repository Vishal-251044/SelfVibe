/**
 * Platform settings (PRD §13 settings, roadmap Day 9): maintenance mode,
 * feature flags, upload limits and the admin IP allowlist. Read through a
 * short cache (every request checks maintenance mode); writes clear it.
 * A setting that was never saved uses its default from SETTINGS_DEFAULTS.
 */
import { Setting } from "../models/setting.model.js";
import { deleteCached, remember } from "./cache.service.js";
import { SETTINGS_DEFAULTS } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

const CACHE_KEY = "settings:all";
const CACHE_SECONDS = 30;

/**
 * Merge a saved value over its default (objects merge one level deep).
 * @param {any} fallback
 * @param {any} saved
 * @returns {any}
 */
function withDefault(fallback, saved) {
  if (saved === undefined) return fallback;
  if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
    return { ...fallback, ...saved };
  }
  return saved;
}

/**
 * Every setting, with defaults filled in.
 * @returns {Promise<typeof SETTINGS_DEFAULTS>}
 */
export function getSettings() {
  return remember(CACHE_KEY, CACHE_SECONDS, async () => {
    const rows = await Setting.find({ key: { $in: Object.keys(SETTINGS_DEFAULTS) } }).lean();
    const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return Object.fromEntries(
      Object.entries(SETTINGS_DEFAULTS).map(([key, fallback]) => [
        key,
        withDefault(fallback, saved[key]),
      ])
    );
  });
}

/**
 * What the apps may know (no IP allowlist): maintenance banner and feature flags.
 * @returns {Promise<{ maintenance: Object, features: Object, uploadLimits: Object }>}
 */
export async function getPublicSettings() {
  const { maintenance, features, uploadLimits } = await getSettings();
  return { maintenance, features, uploadLimits };
}

/**
 * Is a feature switched on?
 * @param {"comments"|"uploads"|"voice"} feature
 * @returns {Promise<boolean>}
 */
export async function isFeatureOn(feature) {
  return (await getSettings()).features[feature] !== false;
}

/**
 * Save some settings (Owner only).
 * @param {Partial<typeof SETTINGS_DEFAULTS>} changes - Validated
 * @param {{ staffId: string, ip: string }} context
 * @returns {Promise<{ before: Object, after: Object }>}
 * @throws {ApiError} 400 when the IP allowlist would lock the Owner out
 */
export async function updateSettings(changes, { staffId, ip }) {
  const before = await getSettings();
  if (changes.adminIpAllowlist?.length && !changes.adminIpAllowlist.includes(ip)) {
    throw ApiError.badRequest(
      `Add your own IP (${ip}) to the allowlist first, or you would be locked out`,
      {
        fields: { adminIpAllowlist: "Your current IP is not in the list" },
      }
    );
  }
  await Promise.all(
    Object.entries(changes).map(([key, value]) =>
      Setting.updateOne(
        { key },
        { $set: { value: withDefault(before[key], value), updatedBy: staffId } },
        { upsert: true }
      )
    )
  );
  await deleteCached(CACHE_KEY);
  const after = await getSettings();
  logger.info(`[Settings] updated ${Object.keys(changes).join(", ")} by staffId=${staffId}`);
  return { before, after };
}
