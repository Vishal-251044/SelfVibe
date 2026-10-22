/**
 * User endpoints: /api/users/*
 * (PATCH /me and onboarding arrive on Day 3.)
 */
import { getUserById, toPublicUser } from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** GET /api/users/me — the signed-in user's profile */
export const getMe = asyncHandler(async (req, res) => {
  const user = await getUserById(req.auth.userId);
  return sendSuccess(res, { message: "User fetched", data: { user: toPublicUser(user) } });
});
