/**
 * Listener / creator authentication API calls (/api/auth/*).
 * These never send an access token: the refresh token travels in the
 * httpOnly cookie.
 */
import { api } from "@/services/api";

const NO_AUTH = { auth: "none" };

/**
 * Create an account and sign in.
 * @param {{ name: string, email: string, password: string }} input
 * @returns {Promise<{ user: Object, accessToken: string }>}
 */
export function register(input) {
  return api.post("/auth/register", input, NO_AUTH);
}

/**
 * Log in with email and password.
 * @param {{ email: string, password: string }} input
 * @returns {Promise<{ user: Object, accessToken: string }>}
 */
export function login(input) {
  return api.post("/auth/login", input, NO_AUTH);
}

/**
 * Exchange the refresh cookie for a new access token.
 * @returns {Promise<{ user: Object, accessToken: string }>}
 */
export function refreshSession() {
  return api.post("/auth/refresh", undefined, NO_AUTH);
}

/**
 * End the current session (always succeeds server-side).
 * @returns {Promise<null>}
 */
export function logout() {
  return api.post("/auth/logout", undefined, NO_AUTH);
}

/**
 * Ask for a password reset link (same answer whether or not the email exists).
 * @param {string} email
 * @returns {Promise<null>}
 */
export function requestPasswordReset(email) {
  return api.post("/auth/forgot", { email }, NO_AUTH);
}

/**
 * Check whether a reset link is still usable.
 * @param {string} token
 * @returns {Promise<{ valid: boolean }>}
 */
export function validateResetToken(token) {
  return api.get("/auth/reset/validate", { ...NO_AUTH, query: { token } });
}

/**
 * Set a new password with a reset link token. Signs out every device.
 * @param {{ token: string, password: string }} input
 * @returns {Promise<null>}
 */
export function resetPassword(input) {
  return api.post("/auth/reset", input, NO_AUTH);
}

/**
 * URL that starts "Continue with Google" (a full-page navigation, not a fetch).
 * @param {string|null} [next] - Internal path to return to afterwards
 * @returns {string}
 */
export function getGoogleSignInUrl(next) {
  const base = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}
