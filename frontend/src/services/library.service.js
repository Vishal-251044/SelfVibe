/**
 * Library API calls (roadmap Day 6): likes (PRD LIB-1) and follows (LIB-4).
 */
import { api } from "@/services/api";

/**
 * @param {string} trackId
 * @returns {Promise<{ liked: true, likeCount: number }>}
 */
export function likeTrack(trackId) {
  return api.post(`/likes/${trackId}`);
}

/**
 * @param {string} trackId
 * @returns {Promise<{ liked: false, likeCount: number }>}
 */
export function unlikeTrack(trackId) {
  return api.delete(`/likes/${trackId}`);
}

/**
 * Liked Songs, newest first.
 * @param {{ page?: number, limit?: number }} [query]
 * @param {Object} [options]
 * @returns {Promise<{ items: Array<{ likedAt: string, track: Object }>, meta: Object }>}
 */
export function getLikedTracks(query = {}, options) {
  return api.get("/likes", { ...options, query });
}

/**
 * Every liked track id (heart icons).
 * @param {Object} [options]
 * @returns {Promise<{ trackIds: string[] }>}
 */
export function getLikedTrackIds(options) {
  return api.get("/likes/ids", options);
}

/**
 * @param {string} artistId
 * @returns {Promise<{ following: true, followersCount: number }>}
 */
export function followArtist(artistId) {
  return api.post(`/follow/${artistId}`);
}

/**
 * @param {string} artistId
 * @returns {Promise<{ following: false, followersCount: number }>}
 */
export function unfollowArtist(artistId) {
  return api.delete(`/follow/${artistId}`);
}

/**
 * Artists I follow.
 * @param {{ page?: number, limit?: number }} [query]
 * @param {Object} [options]
 * @returns {Promise<{ items: Array<{ followedAt: string, artist: Object }>, meta: Object }>}
 */
export function getFollowedArtists(query = {}, options) {
  return api.get("/follows", { ...options, query });
}

/**
 * Every followed artist id (Follow buttons).
 * @param {Object} [options]
 * @returns {Promise<{ artistIds: string[] }>}
 */
export function getFollowedArtistIds(options) {
  return api.get("/follows/ids", options);
}
