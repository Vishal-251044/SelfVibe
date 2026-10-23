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
 * Creator: publish a new track (files already uploaded with uploadMedia).
 * @param {Object} input - title, genres, vibes, mood, language, explicit, lyrics, audioKey, coverKey, rightsConfirmed
 * @returns {Promise<{ track: Object }>}
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
