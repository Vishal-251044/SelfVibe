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

/**
 * Artists that match the quiz picks so far, split into India and worldwide.
 * @param {{ genres: string[], vibes: string[] }} picks - Genre / vibe slugs
 * @param {Object} [options] - Passed to the API client (e.g. signal)
 * @returns {Promise<{ india: Object[], world: Object[] }>}
 */
export function getArtistSuggestions({ genres, vibes }, options) {
  return api.get("/onboarding/artists", {
    ...options,
    query: { genres: genres.join(","), vibes: vibes.join(",") },
  });
}
