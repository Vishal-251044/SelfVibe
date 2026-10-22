/**
 * Signed-in user API calls (/api/users/me/*).
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

/**
 * Update name, bio and / or avatar.
 * @param {{ name?: string, bio?: string, avatar?: string|null }} changes
 * @returns {Promise<{ user: Object }>}
 */
export function updateMe(changes) {
  return api.patch("/users/me", changes);
}

/**
 * Save taste quiz answers.
 * @param {{ genres: string[], vibes: string[], artists?: string[] }} answers
 * @returns {Promise<{ user: Object }>}
 */
export function completeOnboarding(answers) {
  return api.post("/users/me/onboarding", answers);
}

/**
 * Skip the taste quiz.
 * @returns {Promise<{ user: Object }>}
 */
export function skipOnboarding() {
  return api.post("/users/me/onboarding/skip");
}

/**
 * The user's taste profile (null before the quiz).
 * @param {Object} [options] - Passed to the API client (e.g. signal)
 * @returns {Promise<{ taste: Object|null }>}
 */
export function getTaste(options) {
  return api.get("/users/me/taste", options);
}
