/**
 * Staff console auth endpoints: /api/admin/auth/*
 */
import * as staffAuthService from "../services/staffAuth.service.js";
import { getUserById, toStaffUser } from "../services/user.service.js";
import { SESSION_KINDS } from "../config/constants.js";
import { getRequestMeta as requestMeta } from "../helpers/genericFunctions.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import {
  clearSessionCookies,
  readRefreshCookie,
  readStaffDeviceCookie,
  setSessionCookies,
  setStaffDeviceCookie,
} from "../utils/cookies.js";

/** POST /api/admin/auth/login — password step; returns the 2FA challenge */
export const login = asyncHandler(async (req, res) => {
  const result = await staffAuthService.startStaffLogin(req.body, requestMeta(req));
  return sendSuccess(res, {
    message: result.step === "setup" ? "Set up two-factor authentication" : "Enter your code",
    data: result,
  });
});

/** POST /api/admin/auth/2fa/setup — QR code for first-time enrolment */
export const setupTwoFactor = asyncHandler(async (req, res) => {
  const data = await staffAuthService.beginTwoFactorSetup(req.body.challengeToken);
  return sendSuccess(res, { message: "Scan the QR code with your authenticator app", data });
});

/** POST /api/admin/auth/2fa/verify — code step; opens the staff session */
export const verifyTwoFactor = asyncHandler(async (req, res) => {
  const result = await staffAuthService.completeTwoFactor(req.body, {
    ...requestMeta(req),
    deviceId: readStaffDeviceCookie(req),
  });
  setSessionCookies(res, SESSION_KINDS.STAFF, result.refreshToken, result.expiresAt);
  setStaffDeviceCookie(res, result.deviceId);
  return sendSuccess(res, {
    message: "Signed in to the console",
    data: {
      staff: result.staff,
      accessToken: result.accessToken,
      ...(result.backupCodes && { backupCodes: result.backupCodes }),
    },
  });
});

/** POST /api/admin/auth/refresh */
export const refresh = asyncHandler(async (req, res) => {
  try {
    const result = await staffAuthService.refreshStaffSession(
      readRefreshCookie(req, SESSION_KINDS.STAFF)
    );
    setSessionCookies(res, SESSION_KINDS.STAFF, result.refreshToken, result.expiresAt);
    return sendSuccess(res, {
      message: "Session refreshed",
      data: { staff: result.staff, accessToken: result.accessToken },
    });
  } catch (error) {
    // Session is over: drop its cookies. Temporary failures (e.g. DB down) keep them.
    if (error.statusCode === 401) clearSessionCookies(res, SESSION_KINDS.STAFF);
    throw error;
  }
});

/** POST /api/admin/auth/logout — always succeeds */
export const logout = asyncHandler(async (req, res) => {
  await staffAuthService.logoutStaff(readRefreshCookie(req, SESSION_KINDS.STAFF));
  clearSessionCookies(res, SESSION_KINDS.STAFF);
  return sendSuccess(res, { message: "Signed out of the console" });
});

/** GET /api/admin/auth/me — current staff member (also keeps the session active) */
export const getMe = asyncHandler(async (req, res) => {
  const user = await getUserById(req.staff.userId);
  return sendSuccess(res, { message: "Staff member fetched", data: { staff: toStaffUser(user) } });
});
