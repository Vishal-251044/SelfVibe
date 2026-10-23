/**
 * Storage key layout — the only place that decides where files live.
 *   incoming/<owner>/<uuid>.<ext>    browser uploads, before processing (private)
 *   audio/<trackId>/<version>-<kbps>.mp3   transcoded audio (private, signed URLs)
 *   audio/<trackId>/source.<ext>     the original upload (private, for reprocessing)
 *   covers/<kind>/<id>-<version>.webp  processed images (public)
 */
import { randomUUID } from "node:crypto";
import { STORAGE_PREFIXES } from "../../config/constants.js";

/**
 * Prefix that ties incoming uploads to whoever made them.
 * @param {{ userId?: string, staffId?: string }} owner
 * @returns {string} e.g. "u-64b0…" or "s-64b0…"
 */
export function ownerTag({ userId, staffId }) {
  if (staffId) return `s-${staffId}`;
  if (userId) return `u-${userId}`;
  throw new Error("[StorageKeys] an upload owner is required");
}

/**
 * Key for a new browser upload.
 * @param {{ userId?: string, staffId?: string }} owner
 * @param {string} extension - e.g. "mp3"
 * @returns {string}
 */
export function incomingKey(owner, extension) {
  return `${STORAGE_PREFIXES.incoming}/${ownerTag(owner)}/${randomUUID()}.${extension}`;
}

/**
 * Whether an incoming key was issued to this owner (stops using someone else's upload).
 * @param {string} key
 * @param {{ userId?: string, staffId?: string }} owner
 * @returns {boolean}
 */
export function isIncomingKeyOwnedBy(key, owner) {
  const prefix = `${STORAGE_PREFIXES.incoming}/${ownerTag(owner)}/`;
  return typeof key === "string" && key.startsWith(prefix) && !key.includes("..");
}

/**
 * @param {string} trackId
 * @param {string} extension
 * @returns {string}
 */
export function audioSourceKey(trackId, extension) {
  return `${STORAGE_PREFIXES.audio}/${trackId}/source.${extension}`;
}

/**
 * Versioned so a reprocessed track never serves a stale cached file.
 * @param {string} trackId
 * @param {number} bitrateKbps
 * @param {string} version
 * @returns {string}
 */
export function audioRenditionKey(trackId, bitrateKbps, version) {
  return `${STORAGE_PREFIXES.audio}/${trackId}/${version}-${bitrateKbps}.mp3`;
}

/**
 * @param {"tracks"|"artists"|"albums"} kind
 * @param {string} id
 * @param {string} version
 * @returns {string}
 */
export function coverKey(kind, id, version) {
  return `${STORAGE_PREFIXES.covers}/${kind}/${id}-${version}.webp`;
}

/**
 * Only covers may be served without a signature.
 * @param {string} key
 * @returns {boolean}
 */
export function isPublicKey(key) {
  return (
    typeof key === "string" &&
    key.startsWith(`${STORAGE_PREFIXES.covers}/`) &&
    !key.includes("..") &&
    /^[a-zA-Z0-9/_.-]+$/.test(key)
  );
}
