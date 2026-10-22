/**
 * Taste quiz API calls (/api/onboarding/*).
 */
import { api } from "@/services/api";

/**
 * Genres, vibes and artists the quiz can offer.
 * @param {Object} [options] - Passed to the API client (e.g. signal)
 * @returns {Promise<{ genres: Object[], vibes: Object[], artists: Object[] }>}
 */
export function getOnboardingOptions(options) {
  return api.get("/onboarding/options", options);
}
