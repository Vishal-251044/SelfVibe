/**
 * Feed routes (PRD 10.4, roadmap Day 8): /api/feed
 */
import { Router } from "express";
import * as feedController from "../controllers/feed.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { libraryWriteLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  forYouQuerySchema,
  notInterestedParamsSchema,
  notInterestedSchema,
} from "../validators/feed.validator.js";
import { catalogOnlyQuerySchema } from "../validators/adminPlatform.validator.js";

const router = Router();

router.get("/for-you", requireAuth, validate({ query: forYouQuerySchema }), feedController.forYou);
router.get(
  "/daily-mix",
  requireAuth,
  validate({ query: catalogOnlyQuerySchema }),
  feedController.dailyMix
);
router.post(
  "/not-interested",
  requireAuth,
  libraryWriteLimiter,
  validate({ body: notInterestedSchema }),
  feedController.notInterested
);
router.delete(
  "/not-interested/:trackId",
  requireAuth,
  libraryWriteLimiter,
  validate({ params: notInterestedParamsSchema }),
  feedController.undoNotInterested
);

export default router;
