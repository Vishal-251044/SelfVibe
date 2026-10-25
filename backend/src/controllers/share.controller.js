/**
 * Share endpoints: /api/shares (roadmap Day 10).
 */
import { recordShare } from "../services/share.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** POST /api/shares — count a share (signed in or not) */
export const createShare = asyncHandler(async (req, res) => {
  await recordShare(req.validated.body, req.auth?.userId ?? null);
  return sendSuccess(res, { statusCode: 201, message: "Share recorded" });
});
