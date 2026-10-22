/**
 * Set and clear the auth cookies.
 * - Refresh cookie: httpOnly (JavaScript cannot read it), scoped to the auth routes.
 * - Hint cookie: non-secret "a session exists" flag the frontend route guard reads
 *   to avoid a flash of protected pages. It grants no access by itself.
 */
import { COOKIES, OAUTH_STATE_TTL_MS } from "../config/constants.js";
import { env } from "../config/env.js";

/**
 * Shared cookie options.
 * @param {string} path - Cookie path
 * @param {boolean} httpOnly
 * @returns {import("express").CookieOptions}
 */
function baseOptions(path, httpOnly) {
  return {
    httpOnly,
    secure: env.auth.cookieSecure,
    sameSite: "lax", // the frontend proxies /api, so requests are same-site
    path,
  };
}

/**
 * Set the refresh + hint cookies for a session.
 * @param {import("express").Response} res
 * @param {"user"|"staff"} kind - Session kind
 * @param {string} refreshToken - Plain refresh token
 * @param {Date} expiresAt - Session expiry
 */
export function setSessionCookies(res, kind, refreshToken, expiresAt) {
  const { refresh, hint } = cookiesFor(kind);
  const maxAge = Math.max(0, expiresAt.getTime() - Date.now());

  res.cookie(refresh.name, refreshToken, { ...baseOptions(refresh.path, true), maxAge });
  res.cookie(hint.name, "1", { ...baseOptions(hint.path, false), maxAge });
}

/**
 * Clear the refresh + hint cookies for a session kind.
 * @param {import("express").Response} res
 * @param {"user"|"staff"} kind
 */
export function clearSessionCookies(res, kind) {
  const { refresh, hint } = cookiesFor(kind);
  res.clearCookie(refresh.name, baseOptions(refresh.path, true));
  res.clearCookie(hint.name, baseOptions(hint.path, false));
}

/**
 * Read the refresh token cookie for a session kind.
 * @param {import("express").Request} req
 * @param {"user"|"staff"} kind
 * @returns {string|undefined}
 */
export function readRefreshCookie(req, kind) {
  return req.cookies?.[cookiesFor(kind).refresh.name];
}

/**
 * @param {"user"|"staff"} kind
 * @returns {{ refresh: {name: string, path: string}, hint: {name: string, path: string} }}
 */
function cookiesFor(kind) {
  return kind === "staff"
    ? { refresh: COOKIES.STAFF_REFRESH, hint: COOKIES.STAFF_HINT }
    : { refresh: COOKIES.USER_REFRESH, hint: COOKIES.USER_HINT };
}

/**
 * Remember the Google sign-in state (CSRF state, PKCE verifier, return path)
 * until Google redirects back. httpOnly, 10 minutes, only sent to the Google routes.
 * SameSite=Lax still sends it on Google's top-level redirect back to us.
 * @param {import("express").Response} res
 * @param {{ state: string, codeVerifier: string, next: string|null }} value
 */
export function setOAuthStateCookie(res, value) {
  const { name, path } = COOKIES.OAUTH_STATE;
  res.cookie(name, Buffer.from(JSON.stringify(value)).toString("base64url"), {
    ...baseOptions(path, true),
    maxAge: OAUTH_STATE_TTL_MS,
  });
}

/**
 * Read and clear the Google sign-in state cookie (single use).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {{ state: string, codeVerifier: string, next: string|null } | null}
 */
export function consumeOAuthStateCookie(req, res) {
  const { name, path } = COOKIES.OAUTH_STATE;
  const raw = req.cookies?.[name];
  res.clearCookie(name, baseOptions(path, true));
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
