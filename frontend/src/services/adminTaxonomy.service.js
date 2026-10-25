/**
 * Admin Genres & Vibes API calls (roadmap Day 7): /api/admin/genres, /api/admin/vibes.
 */
import { api } from "@/services/api";

/**
 * @param {"genre"|"vibe"} kind
 * @param {Object} [options]
 * @returns {Promise<{ items: Object[] }>}
 */
export function listCategories(kind, options) {
  return api.get(`/admin/${kind}s`, options);
}

/**
 * @param {"genre"|"vibe"} kind
 * @param {{ name: string, icon: string, colour: string, description?: string, active?: boolean }} input
 * @returns {Promise<{ item: Object }>}
 */
export function createCategory(kind, input) {
  return api.post(`/admin/${kind}s`, input);
}

/**
 * @param {"genre"|"vibe"} kind
 * @param {string} id
 * @param {Object} changes - name, icon, colour, description, active
 * @returns {Promise<{ item: Object }>}
 */
export function updateCategory(kind, id, changes) {
  return api.patch(`/admin/${kind}s/${id}`, changes);
}

/**
 * @param {"genre"|"vibe"} kind
 * @param {string[]} ids - Every id in the new order
 * @returns {Promise<{ items: Object[] }>}
 */
export function reorderCategories(kind, ids) {
  return api.put(`/admin/${kind}s/order`, { ids });
}

/**
 * @param {"genre"|"vibe"} kind
 * @param {string} id
 * @returns {Promise<null>}
 */
export function deleteCategory(kind, id) {
  return api.delete(`/admin/${kind}s/${id}`);
}
