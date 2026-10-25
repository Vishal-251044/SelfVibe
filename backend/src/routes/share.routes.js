/**
 * Share routes: /api/shares (roadmap Day 10 share links).
 */
import { Router } from "express";
import { createShare } from "../controllers/share.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { shareLimiter } from "../middlewares/rateLimit.middleware.js";
import { shareSchema } from "../validators/share.validator.js";

const router = Router();

router.post("/", optionalAuth, shareLimiter, validate({ body: shareSchema }), createShare);

export default router;
