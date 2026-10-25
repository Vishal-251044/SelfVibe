/**
 * Browse API calls (roadmap Day 7, PRD BRW-1/2/3): genres, vibes,
 * Trending and New Releases. Every list takes the catalog switch.
 */
import { api } from "@/services/api";

/**
 * Genres or vibes with song counts and covers.
 * @param {"genre"|"vibe"} kind
 * @param {"all"|"official"|"community"} catalog
 * @param {Object} [options]
 * @returns {Promise<{ items: Object[] }>}
 */
export function getCategories(kind, catalog, options) {
  return api.get(`/browse/${kind}s`, { ...options, query: { catalog } });
}

/**
 * A genre or vibe page.
 * @param {"genre"|"vibe"} kind
 * @param {string} slug
 * @param {{ catalog?: string, page?: number, limit?: number, sort?: "popular"|"new" }} query
 * @param {Object} [options]
 * @returns {Promise<{ category: Object, items: Object[], meta: Object }>}
 */
export function getCategory(kind, slug, query, options) {
  return api.get(`/browse/${kind}s/${encodeURIComponent(slug)}`, { ...options, query });
}

/**
 * Most played in the last 7 days.
 * @param {{ catalog?: string, limit?: number }} query
 * @param {Object} [options]
 * @returns {Promise<{ items: Object[] }>}
 */
export function getTrending(query, options) {
  return api.get("/trending", { ...options, query });
}

/**
 * Newest songs.
 * @param {{ catalog?: string, page?: number, limit?: number }} query
 * @param {Object} [options]
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export function getNewReleases(query, options) {
  return api.get("/new-releases", { ...options, query });
}
