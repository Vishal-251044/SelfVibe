/**
 * Staff console authentication API calls (/api/admin/auth/*).
 */
import { api } from "@/services/api";

const NO_AUTH = { auth: "none" };

/**
 * Step 1: email + password.
 * @param {{ email: string, password: string }} input
 * @returns {Promise<{ step: "setup"|"verify", challengeToken: string }>}
 */
export function startLogin(input) {
  return api.post("/admin/auth/login", input, NO_AUTH);
}

/**
 * First login only: get the authenticator QR code.
 * @param {string} challengeToken
 * @returns {Promise<{ qrCodeDataUrl: string, otpauthUrl: string, manualKey: string }>}
 */
export function setupTwoFactor(challengeToken) {
  return api.post("/admin/auth/2fa/setup", { challengeToken }, NO_AUTH);
}

/**
 * Step 2: authenticator or backup code. Opens the staff session.
 * @param {{ challengeToken: string, code: string }} input
 * @returns {Promise<{ staff: Object, accessToken: string, backupCodes?: string[] }>}
 */
export function verifyTwoFactor(input) {
  return api.post("/admin/auth/2fa/verify", input, NO_AUTH);
}

/**
 * Exchange the staff refresh cookie for a new access token.
 * @returns {Promise<{ staff: Object, accessToken: string }>}
 */
export function refreshStaffSession() {
  return api.post("/admin/auth/refresh", undefined, NO_AUTH);
}

/**
 * Sign out of the console.
 * @returns {Promise<null>}
 */
export function logoutStaff() {
  return api.post("/admin/auth/logout", undefined, NO_AUTH);
}

/**
 * Current staff member and permissions (also counts as console activity).
 * @returns {Promise<{ staff: Object }>}
 */
export function getStaffMe() {
  return api.get("/admin/auth/me");
}
