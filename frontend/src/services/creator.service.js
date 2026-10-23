/**
 * Creator profile and public artist pages (/api/creator/*, /api/artists/*).
 */
import { api } from "@/services/api";

/**
 * Turn the signed-in listener into a creator (PRD CRT-1).
 * @param {{ stageName: string, bio?: string, genres?: string[], socials?: Object }} input
 * @returns {Promise<{ user: Object, artist: Object }>}
 */
export function becomeCreator(input) {
  return api.post("/creator/become", input);
}

/**
 * My artist profile, or null when I am not a creator yet.
 * @param {Object} [options]
 * @returns {Promise<{ artist: Object|null }>}
 */
export function getMyArtist(options) {
  return api.get("/creator/me", options);
}

/**
 * Edit my artist profile.
 * @param {Object} changes - stageName, bio, genres, socials, avatarKey
 * @returns {Promise<{ artist: Object }>}
 */
export function updateMyArtist(changes) {
  return api.patch("/creator/me", changes);
}

/**
 * Public artist page: profile, published tracks and albums (guests allowed).
 * @param {string} idOrSlug
 * @param {Object} [options]
 * @returns {Promise<{ artist: Object, tracks: Object[], albums: Object[] }>}
 */
export function getArtistPage(idOrSlug, options) {
  return api.get(`/artists/${encodeURIComponent(idOrSlug)}`, options);
}
