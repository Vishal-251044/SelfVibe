/**
 * Signed stream URL cache for the player. URLs are fetched for the upcoming
 * queue in one request (so the next song starts instantly, even in the
 * background — BGP-5) and fetched again shortly before they expire. Each
 * quality (auto / low / standard / high) is cached separately, so switching
 * to the small copy on slow internet doesn't throw away the others.
 */
import { getStreamUrls } from "@/services/listening.service";
import { STREAM_URL_REFRESH_MARGIN_MS } from "@/utils/musicConstants";

const cache = new Map(); // "quality:trackId" → { url, bitrateKbps, expiresAtMs }
const inFlight = new Map(); // "quality:trackId" → Promise

/**
 * @param {string} trackId
 * @param {string} quality
 * @returns {string}
 */
const keyOf = (trackId, quality) => `${quality}:${trackId}`;

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
 * @param {"user"|"staff"} [scope="user"]
 * @param {"auto"|"low"|"standard"|"high"} [quality="auto"]
 * @returns {Promise<void>}
 */
export async function prefetchStreamUrls(trackIds, scope = "user", quality = "auto") {
  const unique = [...new Set(trackIds)];
  const missing = unique.filter((id) => {
    const key = keyOf(id, quality);
    return !isFresh(cache.get(key)) && !inFlight.has(key);
  });
  if (missing.length === 0) {
    await Promise.all(unique.map((id) => inFlight.get(keyOf(id, quality))).filter(Boolean));
    return;
  }
  const request = getStreamUrls(missing, scope, quality)
    .then((streams) => {
      Object.entries(streams).forEach(([id, stream]) => {
        // Cloudinary URLs carry no expiry; treat them as valid for a day
        const expiresAtMs = stream.expiresAt
          ? new Date(stream.expiresAt).getTime()
          : Date.now() + 24 * 60 * 60 * 1000;
        cache.set(keyOf(id, quality), {
          url: stream.url,
          bitrateKbps: stream.bitrateKbps ?? null,
          expiresAtMs,
        });
      });
    })
    .finally(() => missing.forEach((id) => inFlight.delete(keyOf(id, quality))));
  missing.forEach((id) => inFlight.set(keyOf(id, quality), request));
  await request;
}

/**
 * Stream for one track (cached, refreshed before it expires).
 * @param {string} trackId
 * @param {"user"|"staff"} [scope="user"]
 * @param {"auto"|"low"|"standard"|"high"} [quality="auto"]
 * @returns {Promise<{ url: string, bitrateKbps: number|null }|null>} null when it can't be played
 */
export async function getStream(trackId, scope = "user", quality = "auto") {
  const key = keyOf(trackId, quality);
  if (!isFresh(cache.get(key))) await prefetchStreamUrls([trackId], scope, quality);
  const entry = cache.get(key);
  return entry ? { url: entry.url, bitrateKbps: entry.bitrateKbps } : null;
}

/**
 * Forget a track's URLs in every quality (e.g. after the browser reported one as expired).
 * @param {string} trackId
 */
export function invalidateStreamUrl(trackId) {
  [...cache.keys()]
    .filter((key) => key.endsWith(`:${trackId}`))
    .forEach((key) => cache.delete(key));
}

/** Forget everything (log out). */
export function clearStreamUrls() {
  cache.clear();
}
