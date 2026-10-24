/**
 * Comment API calls (PRD 10.15.1, roadmap Day 6).
 */
import { api } from "@/services/api";

/**
 * Top-level comments on a song.
 * @param {string} trackId
 * @param {{ sort?: "newest"|"top", page?: number, limit?: number }} query
 * @param {Object} [options]
 * @returns {Promise<{ comments: Object[], meta: Object, total: number }>}
 */
export function getComments(trackId, query, options) {
  return api.get(`/tracks/${trackId}/comments`, { ...options, query });
}

/**
 * @param {string} commentId
 * @param {Object} [options]
 * @returns {Promise<{ replies: Object[] }>}
 */
export function getReplies(commentId, options) {
  return api.get(`/comments/${commentId}/replies`, options);
}

/**
 * @param {string} trackId
 * @param {{ body: string, parentId?: string|null }} input
 * @returns {Promise<{ comment: Object }>}
 */
export function postComment(trackId, input) {
  return api.post(`/tracks/${trackId}/comments`, input);
}

/**
 * @param {string} commentId
 * @param {string} body
 * @returns {Promise<{ comment: Object }>}
 */
export function editComment(commentId, body) {
  return api.patch(`/comments/${commentId}`, { body });
}

/**
 * @param {string} commentId
 * @returns {Promise<null>}
 */
export function deleteComment(commentId) {
  return api.delete(`/comments/${commentId}`);
}

/**
 * @param {string} commentId
 * @param {boolean} like
 * @returns {Promise<{ liked: boolean, likeCount: number }>}
 */
export function setCommentLike(commentId, like) {
  return like ? api.post(`/comments/${commentId}/like`) : api.delete(`/comments/${commentId}/like`);
}

/**
 * @param {string} commentId
 * @param {{ reason: string, details?: string }} input
 * @returns {Promise<{ reportId: string }>}
 */
export function reportComment(commentId, input) {
  return api.post(`/comments/${commentId}/report`, input);
}
