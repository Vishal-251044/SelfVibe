/**
 * Signed-in user endpoints: /api/users/me/*
 */
import { getUserById, toPublicUser, updateProfile } from "../services/user.service.js";
import * as onboardingService from "../services/onboarding.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

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
