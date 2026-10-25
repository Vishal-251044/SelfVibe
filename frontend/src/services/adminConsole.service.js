/**
 * Owner Console API calls for Day 9: dashboard, song performance, comments,
 * moderation, users & creators, storage, curation, team, settings and audit log.
 * Console paths (/admin/…) use the staff session automatically.
 */
import { api } from "@/services/api";
import { downloadBlob } from "@/utils/genericFunctions";

/* ===== Dashboard ===== */

/** @param {Object} [options] @returns {Promise<Object>} */
export const getDashboardStats = (options) => api.get("/admin/stats", options);

/* ===== Song performance ===== */

/**
 * @param {{ range: number, catalog: string, q?: string, sort: string, order: string, page: number, limit?: number }} query
 * @param {Object} [options]
 * @returns {Promise<{ items: Object[], meta: Object, summary: Object }>}
 */
export const getPerformance = (query, options) =>
  api.get("/admin/tracks/performance", { ...options, query });

/**
 * @param {string} trackId
 * @param {number} range
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export const getTrackPerformance = (trackId, range, options) =>
  api.get(`/admin/tracks/${trackId}/performance`, { ...options, query: { range } });

/**
 * Download the catalog's stats as CSV.
 * @param {{ range: number, catalog: string, q?: string }} query
 * @returns {Promise<void>}
 */
export async function exportPerformanceCsv(query) {
  const { blob, filename } = await api.get("/admin/tracks/performance/export", {
    query,
    responseType: "file",
  });
  downloadBlob(blob, filename);
}

/**
 * Download one song's day-by-day stats as CSV.
 * @param {string} trackId
 * @param {number} range
 * @returns {Promise<void>}
 */
export async function exportTrackCsv(trackId, range) {
  const { blob, filename } = await api.get(`/admin/tracks/${trackId}/performance/export`, {
    query: { range },
    responseType: "file",
  });
  downloadBlob(blob, filename);
}

/* ===== Comments ===== */

/** @param {Object} query @param {Object} [options] */
export const getAdminComments = (query, options) =>
  api.get("/admin/comments", { ...options, query });
/** @param {string} id @param {"hide"|"unhide"|"delete"|"pin"|"unpin"} action */
export const moderateComment = (id, action) => api.patch(`/admin/comments/${id}`, { action });
/** @param {string} id @param {string} body */
export const replyAsSelfVibe = (id, body) => api.post(`/admin/comments/${id}/reply`, { body });

/* ===== Moderation ===== */

/** @param {Object} query @param {Object} [options] */
export const getReports = (query, options) => api.get("/admin/reports", { ...options, query });
/**
 * @param {{ targetType: string, targetId: string, action: "dismiss"|"takeDown"|"warn"|"restore", note?: string }} input
 */
export const moderateReport = (input) => api.post("/admin/reports/action", input);

/* ===== Users & creators ===== */

/** @param {Object} query @param {Object} [options] */
export const getUsers = (query, options) => api.get("/admin/users", { ...options, query });
/** @param {string} id @param {Object} [options] */
export const getUser = (id, options) => api.get(`/admin/users/${id}`, options);
/** @param {string} id @param {"active"|"suspended"} status */
export const setUserStatus = (id, status) => api.patch(`/admin/users/${id}/status`, { status });
/** @param {string} id @param {boolean} isCreator */
export const setCreatorRole = (id, isCreator) =>
  api.patch(`/admin/users/${id}/creator`, { isCreator });
/** @param {string} id @param {boolean} verified */
export const setArtistVerified = (id, verified) =>
  api.patch(`/admin/users/${id}/verify`, { verified });
/** @param {string} id */
export const sendUserPasswordReset = (id) => api.post(`/admin/users/${id}/password-reset`);
/** @param {Object} [options] */
export const getVerificationRequests = (options) =>
  api.get("/admin/verification-requests", options);

/* ===== Storage ===== */

/** @param {Object} [options] */
export const getStorageAccounts = (options) => api.get("/admin/storage/accounts", options);
/** @param {string} key @param {"paused"|"active"} status */
export const setStorageStatus = (key, status) =>
  api.patch(`/admin/storage/accounts/${key}`, { status });
export const syncStorage = () => api.post("/admin/storage/sync");
/** @param {{ fromKey: string, toKey: string, limit: number }} input */
export const moveStorage = (input) => api.post("/admin/storage/move", input);

/* ===== Curation ===== */

/** @param {Object} [options] */
export const getHomeSections = (options) => api.get("/admin/home-sections", options);
/** @param {Object} input */
export const createHomeSection = (input) => api.post("/admin/home-sections", input);
/** @param {string} id @param {Object} changes */
export const updateHomeSection = (id, changes) => api.patch(`/admin/home-sections/${id}`, changes);
/** @param {string[]} ids */
export const reorderHomeSections = (ids) => api.put("/admin/home-sections/order", { ids });
/** @param {string} id */
export const deleteHomeSection = (id) => api.delete(`/admin/home-sections/${id}`);
/** @param {Object} [options] */
export const getEditorialPlaylists = (options) => api.get("/admin/editorial-playlists", options);
/** @param {Object} input */
export const createEditorialPlaylist = (input) => api.post("/admin/editorial-playlists", input);
/** @param {string} id @param {Object} changes */
export const updateEditorialPlaylist = (id, changes) =>
  api.patch(`/admin/editorial-playlists/${id}`, changes);
/** @param {string} id */
export const deleteEditorialPlaylist = (id) => api.delete(`/admin/editorial-playlists/${id}`);

/* ===== Team (Owner) ===== */

/** @param {Object} [options] */
export const getTeam = (options) => api.get("/admin/team", options);
/** @param {{ email: string, staffRole: string }} input */
export const inviteStaff = (input) => api.post("/admin/team/invites", input);
/** @param {string} id */
export const revokeInvite = (id) => api.delete(`/admin/team/invites/${id}`);
/** @param {string} id @param {string} staffRole */
export const changeStaffRole = (id, staffRole) => api.patch(`/admin/team/${id}`, { staffRole });
/** @param {string} id */
export const removeStaff = (id) => api.delete(`/admin/team/${id}`);

/**
 * Invite page (public — the invitee isn't staff yet).
 * @param {string} token
 * @param {Object} [options]
 */
export const getInvite = (token, options) =>
  api.get(`/admin/invites/${encodeURIComponent(token)}`, { ...options, auth: "none" });
/**
 * @param {string} token
 * @param {{ name?: string, password: string }} input
 */
export const acceptInvite = (token, input) =>
  api.post(`/admin/invites/${encodeURIComponent(token)}/accept`, input, { auth: "none" });

/* ===== Settings (Owner) & audit log ===== */

/** @param {Object} [options] */
export const getSettings = (options) => api.get("/admin/settings", options);
/** @param {Object} changes */
export const saveSettings = (changes) => api.patch("/admin/settings", changes);
/** @param {Object} query @param {Object} [options] */
export const getAuditLogs = (query, options) => api.get("/admin/audit-logs", { ...options, query });
