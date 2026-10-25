/**
 * Voice routes (PRD VOC-6/7, roadmap Day 7): POST /api/voice/log (text only).
 */
import { Router } from "express";
import { logCommand } from "../controllers/voice.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { voiceLogLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { voiceLogSchema } from "../validators/search.validator.js";
import { requireFeature } from "../middlewares/platform.middleware.js";

const router = Router();

router.post(
  "/log",
  optionalAuth,
  requireFeature("voice"),
  voiceLogLimiter,
  validate({ body: voiceLogSchema }),
  logCommand
);

export default router;
