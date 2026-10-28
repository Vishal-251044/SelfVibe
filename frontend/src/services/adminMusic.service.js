/**
 * Admin Console music manager API calls (staff session):
 * /api/admin/taxonomy, /api/admin/tracks/*, /api/admin/artists/*, /api/admin/albums/*.
 */
import { api } from "@/services/api";

/* ===== Taxonomy ===== */

/**
 * Active genres and vibes for the forms.
 * @param {Object} [options]
 * @returns {Promise<{ genres: Object[], vibes: Object[] }>}
 */
export function getAdminTaxonomy(options) {
  return api.get("/admin/taxonomy", options);
}

/* ===== Tracks ===== */

/**
 * Search and filter the whole catalog.
 * @param {{ q?: string, status?: string, processing?: string, genre?: string, artistId?: string, page?: number, limit?: number }} query
 * @param {Object} [options]
 * @returns {Promise<{ tracks: Object[], meta: Object }>}
 */
export function listAdminTracks(query = {}, options) {
  return api.get("/admin/tracks", { ...options, query });
}

/** @returns {Promise<{ track: Object }>} */
export function getAdminTrack(trackId, options) {
  return api.get(`/admin/tracks/${trackId}`, options);
}

/**
 * Add one track (PRD MUS-1).
 * @param {Object} input - metadata, artistId, albumId, audioKey, coverKey, releaseIntent, scheduledAt
 * @returns {Promise<{ track: Object }>}
 */
export function createAdminTrack(input) {
  return api.post("/admin/tracks", input);
}

/** @returns {Promise<{ track: Object }>} */
export function updateAdminTrack(trackId, changes) {
  return api.patch(`/admin/tracks/${trackId}`, changes);
}

/**
 * Publish / unpublish now, or schedule (PRD MUS-3).
 * @param {string} trackId
 * @param {"publish"|"unpublish"|"schedule"} action
 * @param {string} [scheduledAt] - ISO date, for "schedule"
 * @returns {Promise<{ track: Object }>}
 */
export function changeAdminTrackRelease(trackId, action, scheduledAt) {
  return api.post(
    `/admin/tracks/${trackId}/${action}`,
    action === "schedule" ? { scheduledAt } : undefined
  );
}

/**
 * Run processing again, optionally with a replacement audio file.
 * @param {string} trackId
 * @param {string} [audioKey]
 * @returns {Promise<{ track: Object }>}
 */
export function reprocessAdminTrack(trackId, audioKey) {
  return api.post(`/admin/tracks/${trackId}/reprocess`, audioKey ? { audioKey } : {});
}

/** @returns {Promise<null>} */
export function deleteAdminTrack(trackId) {
  return api.delete(`/admin/tracks/${trackId}`);
}

/**
 * Staff preview stream (works for drafts; staff may pick high quality).
 * @param {string} trackId
 * @param {{ quality?: "auto"|"low"|"standard"|"high" }} [params]
 * @returns {Promise<{ url: string, bitrateKbps: number, durationSec: number }>}
 */
export function getAdminPreviewStream(trackId, params = {}) {
  return api.get(`/admin/tracks/${trackId}/stream`, { query: params });
}

/**
 * Start a bulk upload (PRD MUS-2): uploaded files + optional CSV + defaults.
 * @param {{ files: Array<{ fileName: string, audioKey: string }>, csvText?: string, defaults?: Object }} input
 * @returns {Promise<{ bulkImportId: string }>}
 */
export function startBulkUpload(input) {
  return api.post("/admin/tracks/bulk", input, { timeoutMs: 60000 });
}

/** @returns {Promise<{ bulk: { id: string, status: string, total: number, results: Object[], error: string|null } }>} */
export function getBulkUpload(bulkImportId, options) {
  return api.get(`/admin/tracks/bulk/${bulkImportId}`, options);
}

/* ===== Artists ===== */

/**
 * @param {{ q?: string, official?: boolean, page?: number, limit?: number }} query
 * @param {Object} [options]
 * @returns {Promise<{ artists: Object[], meta: Object }>}
 */
export function listAdminArtists(query = {}, options) {
  return api.get("/admin/artists", { ...options, query });
}

/** @returns {Promise<{ artist: Object, albums: Object[] }>} */
export function getAdminArtist(artistId, options) {
  return api.get(`/admin/artists/${artistId}`, options);
}

/** @returns {Promise<{ artist: Object }>} */
export function createAdminArtist(input) {
  return api.post("/admin/artists", input);
}

/** @returns {Promise<{ artist: Object }>} */
export function updateAdminArtist(artistId, changes) {
  return api.patch(`/admin/artists/${artistId}`, changes);
}

/** @returns {Promise<null>} */
export function deleteAdminArtist(artistId) {
  return api.delete(`/admin/artists/${artistId}`);
}

/* ===== Albums ===== */

/** @returns {Promise<{ album: Object, tracks: Object[] }>} */
export function getAdminAlbum(albumId, options) {
  return api.get(`/admin/albums/${albumId}`, options);
}

/** @returns {Promise<{ album: Object }>} */
export function createAdminAlbum(input) {
  return api.post("/admin/albums", input);
}

/** @returns {Promise<{ album: Object }>} */
export function updateAdminAlbum(albumId, changes) {
  return api.patch(`/admin/albums/${albumId}`, changes);
}

/**
 * Save the album's track order.
 * @param {string} albumId
 * @param {string[]} trackIds - In play order
 * @returns {Promise<{ album: Object }>}
 */
export function setAdminAlbumTracks(albumId, trackIds) {
  return api.put(`/admin/albums/${albumId}/tracks`, { trackIds });
}

/** @returns {Promise<null>} */
export function deleteAdminAlbum(albumId) {
  return api.delete(`/admin/albums/${albumId}`);
}
