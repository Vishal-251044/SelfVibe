/**
 * Search API calls (roadmap Day 7, PRD SRC-1/2/3, VOC-4).
 */
import { api } from "@/services/api";

/**
 * Grouped, typo-tolerant search.
 * @param {string} q
 * @param {"all"|"official"|"community"} catalog
 * @param {Object} [options] - e.g. { signal }
 * @returns {Promise<{ query: string, tracks: Object[], artists: Object[], playlists: Object[], categories: Object[] }>}
 */
export function search(q, catalog, options) {
  return api.get("/search", { ...options, query: { q, catalog } });
}

/**
 * Best match for a spoken "play …" request.
 * @param {string} q - What came after "play"
 * @param {"all"|"official"|"community"} catalog
 * @param {Object} [options]
 * @returns {Promise<{ query: string, confident: boolean, best: Object|null, candidates: Array<{ type: string, score: number, item: Object }> }>}
 */
export function voiceSearch(q, catalog, options) {
  return api.get("/search/voice", { ...options, query: { q, catalog } });
}

/**
 * @param {Object} [options]
 * @returns {Promise<{ items: Array<{ query: string, at: string }> }>}
 */
export function getRecentSearches(options) {
  return api.get("/search/recent", options);
}

/**
 * @param {string} query
 * @returns {Promise<{ items: Array<{ query: string, at: string }> }>}
 */
export function addRecentSearch(query) {
  return api.post("/search/recent", { query });
}

/**
 * Forget one recent search, or all of them when `query` is empty.
 * @param {string} [query]
 * @returns {Promise<{ items: Array<{ query: string, at: string }> }>}
 */
export function removeRecentSearch(query) {
  return api.delete("/search/recent", { query: { q: query || undefined } });
}
