/**
 * "Continue with Google" (PRD AUTH-3) using the OAuth 2.0 authorization-code
 * flow with PKCE, implemented directly against Google's endpoints.
 *
 * ID token handling: the token is received straight from Google's token
 * endpoint over TLS, authenticated with our client secret, so per OpenID
 * Connect Core §3.1.3.7 TLS validation stands in for the signature check. The
 * claims (issuer, audience, expiry, verified email) are still validated.
 *
 * Accounts with the same email are linked (one person, one account).
 */
import { createHash } from "node:crypto";
import { User } from "../models/user.model.js";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../config/constants.js";
import { startSession } from "./auth.service.js";
import { revokeAllSessionsForUser } from "./session.service.js";
import { generateRandomToken } from "../utils/crypto.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

export const GOOGLE_ENDPOINTS = Object.freeze({
  authorize: "https://accounts.google.com/o/oauth2/v2/auth",
  token: "https://oauth2.googleapis.com/token",
});
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const CLOCK_SKEW_SEC = 60;
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Build the Google consent-screen URL plus the secrets to remember until the callback.
 * @returns {{ url: string, state: string, codeVerifier: string }}
 */
export function createGoogleAuthRequest() {
  const state = generateRandomToken(24); // CSRF protection
  const codeVerifier = generateRandomToken(48); // PKCE
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: env.google.callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    access_type: "online",
  });

  return { url: `${GOOGLE_ENDPOINTS.authorize}?${params}`, state, codeVerifier };
}

/**
 * Validate the claims of a Google ID token and return the profile (pure).
 * @param {string} idToken - JWT from Google's token endpoint
 * @param {number} [nowSec] - Current time in seconds (for tests)
 * @returns {{ googleId: string, email: string, emailVerified: boolean, name: string, picture: string|null }}
 * @throws {ApiError} 401 when the token is malformed or not meant for us
 */
export function parseGoogleIdToken(idToken, nowSec = Math.floor(Date.now() / 1000)) {
  let claims;
  try {
    claims = JSON.parse(Buffer.from(String(idToken).split(".")[1], "base64url").toString("utf8"));
  } catch {
    throw ApiError.unauthorized("Google sign-in failed: malformed ID token");
  }

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const problems = [
    !GOOGLE_ISSUERS.includes(claims.iss) && "issuer",
    !audiences.includes(env.google.clientId) && "audience",
    !(Number(claims.exp) > nowSec - CLOCK_SKEW_SEC) && "expiry",
    !claims.sub && "subject",
    !claims.email && "email",
  ].filter(Boolean);

  if (problems.length > 0) {
    throw ApiError.unauthorized(`Google sign-in failed: invalid ID token (${problems.join(", ")})`);
  }

  return {
    googleId: String(claims.sub),
    email: String(claims.email).trim().toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    name: (claims.name || claims.given_name || claims.email.split("@")[0]).slice(0, 80),
    picture: claims.picture || null,
  };
}

/**
 * Exchange the authorization code for the user's Google profile.
 * @param {string} code - From Google's redirect
 * @param {string} codeVerifier - PKCE verifier saved when the flow started
 * @returns {Promise<ReturnType<typeof parseGoogleIdToken>>}
 * @throws {ApiError} 502 when Google cannot be reached, 401 when the code is rejected
 */
export async function exchangeCodeForProfile(code, codeVerifier) {
  let response;
  try {
    response = await fetch(GOOGLE_ENDPOINTS.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        code_verifier: codeVerifier,
        client_id: env.google.clientId,
        client_secret: env.google.clientSecret,
        redirect_uri: env.google.callbackUrl,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logger.error({ err: error }, "[GoogleAuthService] could not reach Google token endpoint");
    throw new ApiError(502, "Could not reach Google. Please try again.");
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.id_token) {
    logger.warn(
      `[GoogleAuthService] token exchange rejected status=${response.status} error=${payload.error ?? "unknown"}`
    );
    throw ApiError.unauthorized("Google sign-in failed. Please try again.");
  }

  return parseGoogleIdToken(payload.id_token);
}

/**
 * Find, link or create the SelfVibe account for a Google profile, then sign in.
 * Linking rule (AUTH-3): same email = same account. If that account was created
 * with a password but its email was never verified, the password is removed
 * and its sessions are ended — this stops someone who pre-registered another
 * person's email from keeping access once the real owner signs in with Google.
 * @param {ReturnType<typeof parseGoogleIdToken>} profile
 * @param {{ userAgent?: string, ip?: string }} meta
 * @returns {Promise<import("./auth.service.js").AuthResult>}
 */
export async function signInWithGoogle(profile, meta) {
  if (!profile.emailVerified) {
    throw ApiError.forbidden("Your Google account's email isn't verified yet.", {
      code: ERROR_CODES.GOOGLE_EMAIL_UNVERIFIED,
    });
  }

  let user = await User.findOne({ googleId: profile.googleId }).select("+googleId");

  if (!user) {
    user = await User.findOne({ email: profile.email }).select("+googleId +passwordHash");
    if (user) {
      await linkGoogleAccount(user, profile);
    } else {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        avatar: profile.picture,
        emailVerified: true,
        roles: ["listener"],
      });
      logger.info(`[GoogleAuthService] new account via Google userId=${user._id}`);
    }
  }

  if (user.status === "suspended") {
    throw ApiError.forbidden("This account has been suspended. Contact support for help.", {
      code: ERROR_CODES.ACCOUNT_SUSPENDED,
    });
  }

  user.lastLoginAt = new Date();
  await user.save();
  return startSession(user, meta);
}

/**
 * Attach a Google identity to an existing account (mutates and relies on the caller's save).
 * @param {Object} user - Existing user (with +googleId +passwordHash)
 * @param {Object} profile - Verified Google profile
 * @throws {ApiError} 409 when the account is already linked to a different Google account
 */
async function linkGoogleAccount(user, profile) {
  if (user.googleId && user.googleId !== profile.googleId) {
    throw ApiError.conflict("This email is already linked to a different Google account.", {
      code: ERROR_CODES.GOOGLE_ACCOUNT_CONFLICT,
    });
  }

  if (!user.emailVerified && user.passwordHash) {
    user.passwordHash = undefined;
    const revoked = await revokeAllSessionsForUser(user._id, "unverified_password_removed");
    logger.warn(
      `[GoogleAuthService] linked Google to unverified password account userId=${user._id} — password removed, sessionsRevoked=${revoked}`
    );
  }

  user.googleId = profile.googleId;
  user.emailVerified = true;
  if (!user.avatar && profile.picture) user.avatar = profile.picture;
  logger.info(`[GoogleAuthService] Google linked to existing account userId=${user._id}`);
}
