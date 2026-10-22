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
