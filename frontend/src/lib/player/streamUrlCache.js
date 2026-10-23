/**
 * Signed stream URL cache for the player. URLs are fetched for the upcoming
 * queue in one request (so the next song starts instantly, even in the
 * background — BGP-5) and fetched again shortly before they expire.
 */
import { getStreamUrls } from "@/services/listening.service";
import { STREAM_URL_REFRESH_MARGIN_MS } from "@/utils/musicConstants";

const cache = new Map(); // trackId → { url, expiresAtMs }
const inFlight = new Map(); // trackId → Promise

/**
 * Whether a cached URL is still good for a while.
 * @param {{ expiresAtMs: number }|undefined} entry
 * @returns {boolean}
 */
const isFresh = (entry) =>
  Boolean(entry) && entry.expiresAtMs - Date.now() > STREAM_URL_REFRESH_MARGIN_MS;

/**
 * Fetch URLs for the given tracks that are not cached yet.
 * @param {string[]} trackIds
 * @param {"user"|"staff"} scope
 * @returns {Promise<void>}
 */
export async function prefetchStreamUrls(trackIds, scope = "user") {
  const missing = [...new Set(trackIds)].filter(
    (id) => !isFresh(cache.get(id)) && !inFlight.has(id)
  );
  if (missing.length === 0) {
    await Promise.all(trackIds.map((id) => inFlight.get(id)).filter(Boolean));
    return;
  }
  const request = getStreamUrls(missing, scope)
    .then((streams) => {
      Object.entries(streams).forEach(([id, stream]) => {
        // Cloudinary URLs carry no expiry; treat them as valid for a day
        const expiresAtMs = stream.expiresAt
          ? new Date(stream.expiresAt).getTime()
          : Date.now() + 24 * 60 * 60 * 1000;
        cache.set(id, { url: stream.url, expiresAtMs });
      });
    })
    .finally(() => missing.forEach((id) => inFlight.delete(id)));
  missing.forEach((id) => inFlight.set(id, request));
  await request;
}

/**
 * Stream URL for one track (cached, refreshed before it expires).
 * @param {string} trackId
 * @param {"user"|"staff"} [scope="user"]
 * @returns {Promise<string|null>} null when the track can't be played
 */
export async function getStreamUrl(trackId, scope = "user") {
  if (!isFresh(cache.get(trackId))) await prefetchStreamUrls([trackId], scope);
  return cache.get(trackId)?.url ?? null;
}

/**
 * Forget a URL (e.g. after the browser reported it as expired).
 * @param {string} trackId
 */
export function invalidateStreamUrl(trackId) {
  cache.delete(trackId);
}

/** Forget everything (log out). */
export function clearStreamUrls() {
  cache.clear();
}
