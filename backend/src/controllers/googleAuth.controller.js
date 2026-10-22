/**
 * "Continue with Google" endpoints: /api/auth/google and /api/auth/google/callback.
 * These are browser navigations (not fetch calls), so every outcome is a
 * redirect back to the web app — success to the app, failure to /login?error=…
 */
import { timingSafeEqual } from "node:crypto";
import * as googleAuthService from "../services/googleAuth.service.js";
import { env } from "../config/env.js";
import { ERROR_CODES, SESSION_KINDS } from "../config/constants.js";
import { getRequestMeta, getSafeRedirectPath } from "../helpers/genericFunctions.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  consumeOAuthStateCookie,
  setOAuthStateCookie,
  setSessionCookies,
} from "../utils/cookies.js";
import { logger } from "../utils/logger.js";

/** Error codes the login page knows how to explain. */
const LOGIN_ERRORS = {
  [ERROR_CODES.ACCOUNT_SUSPENDED]: "account_suspended",
  [ERROR_CODES.GOOGLE_EMAIL_UNVERIFIED]: "google_email_unverified",
  [ERROR_CODES.GOOGLE_ACCOUNT_CONFLICT]: "google_account_conflict",
};

/**
 * Redirect to a path in the web app.
 * @param {import("express").Response} res
 * @param {string} path - Starts with "/"
 */
function redirectToApp(res, path) {
  res.redirect(302, `${env.appUrl}${path}`);
}

/**
 * Constant-time string comparison.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

/** GET /api/auth/google?next=/library — send the user to Google's consent screen */
export const startGoogleSignIn = (req, res) => {
  if (!env.google.isConfigured) {
    logger.warn("[GoogleAuth] sign-in attempted but GOOGLE_CLIENT_ID / SECRET are not set");
    return redirectToApp(res, "/login?error=google_unavailable");
  }

  const { url, state, codeVerifier } = googleAuthService.createGoogleAuthRequest();
  setOAuthStateCookie(res, { state, codeVerifier, next: getSafeRedirectPath(req.query.next) });
  return res.redirect(302, url);
};

/** GET /api/auth/google/callback — Google sends the user back here */
export const handleGoogleCallback = asyncHandler(async (req, res) => {
  const saved = consumeOAuthStateCookie(req, res);
  const { code, state, error } = req.query;

  if (error) {
    logger.info(`[GoogleAuth] user cancelled or Google returned error=${error}`);
    return redirectToApp(res, "/login?error=google_cancelled");
  }
  if (
    !saved ||
    typeof state !== "string" ||
    typeof code !== "string" ||
    !safeEqual(state, saved.state)
  ) {
    logger.warn("[GoogleAuth] callback rejected: missing or mismatched state");
    return redirectToApp(res, "/login?error=google_failed");
  }

  try {
    const profile = await googleAuthService.exchangeCodeForProfile(code, saved.codeVerifier);
    const result = await googleAuthService.signInWithGoogle(profile, getRequestMeta(req));
    setSessionCookies(res, SESSION_KINDS.USER, result.refreshToken, result.expiresAt);

    // New users take the taste quiz first, then continue to where they were going
    const next = getSafeRedirectPath(saved.next);
    if (!result.user.onboardingDone) {
      return redirectToApp(
        res,
        next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding"
      );
    }
    return redirectToApp(res, next ?? "/home");
  } catch (signInError) {
    const reason = LOGIN_ERRORS[signInError.details?.code] ?? "google_failed";
    if (reason === "google_failed") {
      logger.error({ err: signInError }, "[GoogleAuth] sign-in failed");
    }
    return redirectToApp(res, `/login?error=${reason}`);
  }
});
