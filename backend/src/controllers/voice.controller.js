/**
 * Voice command log (PRD VOC-6/7, roadmap Day 7): POST /api/voice/log.
 */
import { logVoiceCommand } from "../services/voice.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** POST /api/voice/log — text only, kept 30 days */
export const logCommand = asyncHandler(async (req, res) => {
  const result = await logVoiceCommand(req.auth?.userId ?? null, req.body);
  return sendSuccess(res, { statusCode: 201, message: "Voice command logged", data: result });
});
