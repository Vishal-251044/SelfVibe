/**
 * Public platform API calls (Day 9): settings the app needs (maintenance,
 * feature flags) and the staff-curated Home sections.
 */
import { api } from "@/services/api";

/**
 * @param {Object} [options]
 * @returns {Promise<{ maintenance: { enabled: boolean, message: string }, features: { comments: boolean, uploads: boolean, voice: boolean }, uploadLimits: Object }>}
 */
export function getPublicSettings(options) {
  return api.get("/settings/public", { ...options, auth: "none" });
}

/**
 * Curated Home sections (hero banners, featured songs / artists, editorial playlists).
 * @param {{ catalog: string }} query
 * @param {Object} [options]
 * @returns {Promise<{ sections: Object[] }>}
 */
export function getHomeSections(query, options) {
  return api.get("/home/sections", { ...options, query });
}
