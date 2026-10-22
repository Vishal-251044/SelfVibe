/**
 * Listener / creator auth endpoints: /api/auth/*
 * The refresh token only ever travels in the httpOnly cookie; the access token
 * is returned in the body and kept in memory by the frontend.
 */
import * as authService from "../services/auth.service.js";
import * as passwordResetService from "../services/passwordReset.service.js";
import { SESSION_KINDS } from "../config/constants.js";
import { getRequestMeta as requestMeta } from "../helpers/genericFunctions.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { clearSessionCookies, readRefreshCookie, setSessionCookies } from "../utils/cookies.js";

/**
 * Set the cookie and send the user + access token.
 * @param {import("express").Response} res
 * @param {Object} result - AuthResult from the service
 * @param {number} statusCode
 * @param {string} message
 */
function sendSession(res, result, statusCode, message) {
  setSessionCookies(res, SESSION_KINDS.USER, result.refreshToken, result.expiresAt);
  return sendSuccess(res, {
    statusCode,
    message,
    data: { user: result.user, accessToken: result.accessToken },
  });
}

/** POST /api/auth/register */
export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, requestMeta(req));
  return sendSession(res, result, 201, "Account created");
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, requestMeta(req));
  return sendSession(res, result, 200, "Logged in");
});

/** POST /api/auth/refresh — clears cookies when the session is no longer valid */
export const refresh = asyncHandler(async (req, res) => {
  try {
    const result = await authService.refresh(readRefreshCookie(req, SESSION_KINDS.USER));
    return sendSession(res, result, 200, "Session refreshed");
  } catch (error) {
    // Session is over: drop its cookies. Temporary failures (e.g. DB down) keep them.
    if (error.statusCode === 401) clearSessionCookies(res, SESSION_KINDS.USER);
    throw error;
  }
});

/** POST /api/auth/logout — always succeeds */
export const logout = asyncHandler(async (req, res) => {
  await authService.logout(readRefreshCookie(req, SESSION_KINDS.USER));
  clearSessionCookies(res, SESSION_KINDS.USER);
  return sendSuccess(res, { message: "Logged out" });
});

/** POST /api/auth/forgot — always the same answer, whether or not the email exists */
export const forgotPassword = asyncHandler(async (req, res) => {
  await passwordResetService.requestPasswordReset(req.body.email);
  return sendSuccess(res, {
    message: "If an account exists for that email, we've sent a link to reset your password.",
  });
});

/** GET /api/auth/reset/validate?token= — lets the reset page warn about dead links up front */
export const validateResetToken = asyncHandler(async (req, res) => {
  const isValid = await passwordResetService.isResetTokenValid(req.validated.query.token);
  return sendSuccess(res, { message: "Reset link checked", data: { valid: isValid } });
});

/** POST /api/auth/reset — set a new password; signs out every device */
export const resetPassword = asyncHandler(async (req, res) => {
  await passwordResetService.resetPassword(req.body);
  clearSessionCookies(res, SESSION_KINDS.USER);
  return sendSuccess(res, { message: "Your password has been changed. Please log in." });
});
