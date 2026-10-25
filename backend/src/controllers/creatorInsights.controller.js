/**
 * Creator analytics and verification (roadmap Day 9):
 * GET /api/creator/analytics · POST /api/creator/verification-request
 */
import { getCreatorAnalytics, requestVerification } from "../services/creatorAnalytics.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** GET /api/creator/analytics?range= */
export const analytics = asyncHandler(async (req, res) => {
  const data = await getCreatorAnalytics(req.auth.userId, { rangeDays: req.validated.query.range });
  return sendSuccess(res, { message: "Analytics fetched", data });
});

/** POST /api/creator/verification-request */
export const verificationRequest = asyncHandler(async (req, res) => {
  const result = await requestVerification(req.auth.userId, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Verification requested — our team will review it",
    data: result,
  });
});
