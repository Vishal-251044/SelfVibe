/**
 * Track API calls for listeners and creators (/api/tracks/*, /api/creator/tracks).
 */
import { api } from "@/services/api";

/**
 * A published track (works for guests).
 * @param {string} trackId
 * @param {Object} [options] - Passed to the API client (e.g. signal)
 * @returns {Promise<{ track: Object }>}
 */
export function getTrack(trackId, options) {
  return api.get(`/tracks/${trackId}`, options);
}

/**
 * A short-lived signed URL to stream a track (signed-in listeners).
 * @param {string} trackId
 * @param {{ quality?: "standard"|"high" }} [params]
 * @returns {Promise<{ url: string, expiresAt: string, bitrateKbps: number, durationSec: number }>}
 */
export function getStreamUrl(trackId, params = {}) {
  return api.get(`/tracks/${trackId}/stream`, { query: params });
}

/**
 * Upload a new song as any signed-in user (files already uploaded with uploadMedia).
 * The first upload also creates the creator profile (PRD CRT-1) and returns the
 * updated user, so the client can refresh its session for the new role.
 * @param {Object} input - title, genres, vibes, mood, language, explicit, lyrics, audioKey, coverKey, rightsConfirmed, stageName
 * @returns {Promise<{ track: Object, user: Object|null }>}
 */
export function createMyTrack(input) {
  return api.post("/tracks", input);
}

/**
 * Creator: my uploads, newest first.
 * @param {{ page?: number, limit?: number, status?: string }} [query]
 * @param {Object} [options]
 * @returns {Promise<{ tracks: Object[], meta: Object }>}
 */
export function listMyTracks(query = {}, options) {
  return api.get("/creator/tracks", { ...options, query });
}

/**
 * Creator: edit one of my tracks.
 * @param {string} trackId
 * @param {Object} changes
 * @returns {Promise<{ track: Object }>}
 */
export function updateMyTrack(trackId, changes) {
  return api.patch(`/tracks/${trackId}`, changes);
}

/**
 * Creator: make my track live or take it down.
 * @param {string} trackId
 * @param {"publish"|"unpublish"} action
 * @returns {Promise<{ track: Object }>}
 */
export function changeMyTrackRelease(trackId, action) {
  return api.post(`/tracks/${trackId}/${action}`);
}

/**
 * Creator: delete my track.
 * @param {string} trackId
 * @returns {Promise<null>}
 */
export function deleteMyTrack(trackId) {
  return api.delete(`/tracks/${trackId}`);
}

/**
 * My community upload allowance (PRD CRT-8): songs used, limit (null = unlimited)
 * and storage used.
 * @param {Object} [options]
 * @returns {Promise<{ songsUsed: number, songLimit: number|null, bytesUsed: number }>}
 */
export function getMyUploadUsage(options) {
  return api.get("/creator/usage", options);
}
