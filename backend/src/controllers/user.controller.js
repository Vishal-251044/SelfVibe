/**
 * Signed-in user endpoints: /api/users/me/*
 */
import { getUserById, toPublicUser, updateProfile } from "../services/user.service.js";
import * as onboardingService from "../services/onboarding.service.js";
import { deleteMyAccount, exportMyData } from "../services/privacy.service.js";
import { SESSION_KINDS } from "../config/constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { clearSessionCookies } from "../utils/cookies.js";

/** GET /api/users/me — the signed-in user's profile */
export const getMe = asyncHandler(async (req, res) => {
  const user = await getUserById(req.auth.userId);
  return sendSuccess(res, { message: "User fetched", data: { user: toPublicUser(user) } });
});

/** PATCH /api/users/me — edit name, bio, avatar */
export const updateMe = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.auth.userId, req.body);
  return sendSuccess(res, { message: "Profile updated", data: { user: toPublicUser(user) } });
});

/** POST /api/users/me/onboarding — save taste quiz answers */
export const completeOnboarding = asyncHandler(async (req, res) => {
  const user = await onboardingService.completeOnboarding(req.auth.userId, req.body);
  return sendSuccess(res, { message: "Taste profile saved", data: { user: toPublicUser(user) } });
});

/** POST /api/users/me/onboarding/skip — skip the quiz (feed uses trending) */
export const skipOnboarding = asyncHandler(async (req, res) => {
  const user = await onboardingService.skipOnboarding(req.auth.userId);
  return sendSuccess(res, { message: "Onboarding skipped", data: { user: toPublicUser(user) } });
});

/** GET /api/users/me/taste — the user's taste profile (null before the quiz) */
export const getTaste = asyncHandler(async (req, res) => {
  const taste = await onboardingService.getTasteSummary(req.auth.userId);
  return sendSuccess(res, { message: "Taste profile fetched", data: { taste } });
});

/** GET /api/users/me/export — download everything SelfVibe stores about me (JSON file) */
export const exportData = asyncHandler(async (req, res) => {
  const data = await exportMyData(req.auth.userId);
  const day = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Disposition", `attachment; filename="selfvibe-my-data-${day}.json"`);
  res.setHeader("Cache-Control", "no-store");
  res.type("application/json").send(JSON.stringify(data, null, 2));
});

/** DELETE /api/users/me — delete my account for good, then sign out */
export const deleteMe = asyncHandler(async (req, res) => {
  await deleteMyAccount(req.auth.userId, req.body);
  clearSessionCookies(res, SESSION_KINDS.USER);
  return sendSuccess(res, { message: "Your account has been deleted" });
});
