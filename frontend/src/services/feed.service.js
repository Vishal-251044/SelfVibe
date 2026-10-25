/**
 * For You feed API calls (roadmap Day 8, PRD 10.4).
 */
import { api } from "@/services/api";

/**
 * Personal feed sections: Jump back in, Made for You, Right now, Trending, Fresh creators.
 * @param {{ catalog: "all"|"official"|"community", hour?: number }} query - hour = local hour (0–23)
 * @param {Object} [options]
 * @returns {Promise<{ generatedAt: string, cached: boolean, sections: Array<{ key: string, title: string, subtitle: string, vibe: string|null, items: Object[] }> }>}
 */
export function getForYouFeed(query, options) {
  return api.get("/feed/for-you", { ...options, query });
}

/**
 * Hide a song from recommendations ("Not interested").
 * @param {string} trackId
 * @returns {Promise<{ trackId: string, hidden: true }>}
 */
export function markNotInterested(trackId) {
  return api.post("/feed/not-interested", { trackId });
}

/**
 * Undo "Not interested".
 * @param {string} trackId
 * @returns {Promise<{ trackId: string, hidden: false }>}
 */
export function undoNotInterested(trackId) {
  return api.delete(`/feed/not-interested/${trackId}`);
}

/**
 * Daily Mix 1–3 (Day 9).
 * @param {{ catalog: string }} query
 * @param {Object} [options]
 * @returns {Promise<{ mixes: Array<{ index: number, title: string, subtitle: string, tag: Object, coverUrls: string[], tracks: Object[] }> }>}
 */
export function getDailyMixes(query, options) {
  return api.get("/feed/daily-mix", { ...options, query });
}

/**
 * Songs like a song (co-listened first, then same genre / vibe).
 * @param {string} trackId
 * @param {{ catalog?: string, limit?: number }} [query]
 * @param {Object} [options]
 * @returns {Promise<{ seed: { id: string, title: string }, items: Object[] }>}
 */
export function getSimilarTracks(trackId, query = {}, options) {
  return api.get(`/tracks/${trackId}/similar`, { ...options, query });
}
