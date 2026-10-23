/**
 * Report endpoint: /api/reports (PRD F32)
 */
import { createReport } from "../services/report.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** POST /api/reports — flag a track or artist for review */
export const fileReport = asyncHandler(async (req, res) => {
  const report = await createReport(req.auth.userId, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Thanks — our team will review this.",
    data: { reportId: String(report._id) },
  });
});
