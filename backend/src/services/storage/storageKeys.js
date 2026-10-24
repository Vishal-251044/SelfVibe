/**
 * Storage key layout — the only place that decides where files live.
 *   incoming/<owner>/<uuid>.<ext>    browser uploads, before processing (private)
 *   audio/<trackId>/<version>-<kbps>.mp3   transcoded audio (private, signed URLs)
 *   audio/<trackId>/source.<ext>     the original upload (private, for reprocessing)
 *   covers/<kind>/<id>-<version>.webp  processed images (public)
 *
 * With the Cloudinary storage pool, every key starts with the pool account it
 * lives in, e.g. "off1/audio/<trackId>/source.mp3" (PRD 10.13 step 4), so a
 * file is always read, moved and deleted on the right account.
 */
import { randomUUID } from "node:crypto";
import { STORAGE_PREFIXES } from "../../config/constants.js";

const LAYOUT_ROOTS = new Set(Object.values(STORAGE_PREFIXES));

/**
 * Split a key into its pool account (if any) and the path inside the account.
 * @param {string} key
 * @returns {{ accountKey: string|null, path: string }}
 */
export function splitAccountKey(key) {
  const [first, ...rest] = String(key).split("/");
  if (LAYOUT_ROOTS.has(first) || rest.length === 0) return { accountKey: null, path: String(key) };
  return { accountKey: first, path: rest.join("/") };
}

/**
 * Put a path on a pool account (no-op without an account, e.g. local / S3 storage).
 * @param {string|null} accountKey
 * @param {string} path
 * @returns {string}
 */
export function withAccount(accountKey, path) {
  return accountKey ? `${accountKey}/${path}` : path;
}

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
  if (typeof key !== "string" || key.includes("..")) return false;
  const prefix = `${STORAGE_PREFIXES.incoming}/${ownerTag(owner)}/`;
  return splitAccountKey(key).path.startsWith(prefix);
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
 * @param {"tracks"|"artists"|"albums"|"playlists"} kind
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
    splitAccountKey(key).path.startsWith(`${STORAGE_PREFIXES.covers}/`) &&
    !key.includes("..") &&
    /^[a-zA-Z0-9/_.-]+$/.test(key)
  );
}
