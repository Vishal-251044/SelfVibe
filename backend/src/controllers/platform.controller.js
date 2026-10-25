/**
 * Public platform info (roadmap Day 9): GET /api/settings/public — maintenance
 * banner and feature flags, so the apps can hide switched-off features.
 */
import { getPublicSettings } from "../services/settings.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** GET /api/settings/public */
export const publicSettings = asyncHandler(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return sendSuccess(res, { message: "Settings fetched", data: await getPublicSettings() });
});
