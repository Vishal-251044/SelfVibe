/**
 * Creator routes: /api/creator
 */
import { Router } from "express";
import * as creatorController from "../controllers/creator.controller.js";
import * as trackController from "../controllers/track.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { becomeCreatorSchema, updateCreatorSchema } from "../validators/artist.validator.js";
import { listTracksQuerySchema } from "../validators/track.validator.js";
import * as creatorInsights from "../controllers/creatorInsights.controller.js";
import {
  creatorAnalyticsQuerySchema,
  verificationRequestSchema,
} from "../validators/adminPlatform.validator.js";

const router = Router();

router.use(requireAuth);

router.post("/become", validate({ body: becomeCreatorSchema }), creatorController.becomeCreator);
router.get("/me", creatorController.getMyArtist);
router.patch(
  "/me",
  requireRole("creator"),
  validate({ body: updateCreatorSchema }),
  creatorController.updateMyArtist
);
// Own uploads + upload allowance (any signed-in user — empty before the first upload)
router.get("/tracks", validate({ query: listTracksQuerySchema }), trackController.listMyTracks);
router.get("/usage", trackController.getMyUploadUsage);
// Own songs' numbers (PRD CRT-7, PRF-4) and the verified-badge request (Day 9)
router.get(
  "/analytics",
  requireRole("creator"),
  validate({ query: creatorAnalyticsQuerySchema }),
  creatorInsights.analytics
);
router.post(
  "/verification-request",
  requireRole("creator"),
  validate({ body: verificationRequestSchema }),
  creatorInsights.verificationRequest
);

export default router;
