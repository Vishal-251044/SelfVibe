/**
 * Playlist API calls (PRD LIB-2, roadmap Day 6): /api/playlists/*
 */
import { api } from "@/services/api";

/**
 * My playlists (cards with covers and track ids).
 * @param {Object} [options]
 * @returns {Promise<{ playlists: Object[] }>}
 */
export function getMyPlaylists(options) {
  return api.get("/playlists", options);
}

/**
 * @param {{ name: string, description?: string, isPublic?: boolean }} input
 * @returns {Promise<{ playlist: Object }>}
 */
export function createPlaylist(input) {
  return api.post("/playlists", input);
}

/**
 * A playlist with its songs (mine, or anyone's public one).
 * @param {string} playlistId
 * @param {Object} [options]
 * @returns {Promise<{ playlist: Object }>}
 */
export function getPlaylist(playlistId, options) {
  return api.get(`/playlists/${playlistId}`, options);
}

/**
 * @param {string} playlistId
 * @param {{ name?: string, description?: string, isPublic?: boolean, coverKey?: string|null }} changes
 * @returns {Promise<{ playlist: Object }>}
 */
export function updatePlaylist(playlistId, changes) {
  return api.patch(`/playlists/${playlistId}`, changes);
}

/**
 * @param {string} playlistId
 * @returns {Promise<null>}
 */
export function deletePlaylist(playlistId) {
  return api.delete(`/playlists/${playlistId}`);
}

/**
 * @param {string} playlistId
 * @param {string[]} trackIds
 * @returns {Promise<{ playlist: Object, added: number }>}
 */
export function addTracksToPlaylist(playlistId, trackIds) {
  return api.post(`/playlists/${playlistId}/tracks`, { trackIds });
}

/**
 * @param {string} playlistId
 * @param {string} trackId
 * @returns {Promise<{ playlist: Object }>}
 */
export function removeTrackFromPlaylist(playlistId, trackId) {
  return api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
}

/**
 * @param {string} playlistId
 * @param {string[]} trackIds - Every song, in the new order
 * @returns {Promise<{ playlist: Object }>}
 */
export function reorderPlaylist(playlistId, trackIds) {
  return api.put(`/playlists/${playlistId}/tracks`, { trackIds });
}
