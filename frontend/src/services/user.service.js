/**
 * User API calls (/api/users/*).
 */
import { api } from "@/services/api";

/**
 * Fetch the signed-in user's profile.
 * @param {Object} [options] - Passed to the API client (e.g. signal)
 * @returns {Promise<{ user: Object }>}
 */
export function getMe(options) {
  return api.get("/users/me", options);
}
