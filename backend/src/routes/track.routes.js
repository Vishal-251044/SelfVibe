/**
 * Track routes: /api/tracks
 */
import { Router } from "express";
import * as trackController from "../controllers/track.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  creatorCreateTrackSchema,
  creatorUpdateTrackSchema,
  streamQuerySchema,
  trackIdParamsSchema,
} from "../validators/track.validator.js";

const router = Router();
const idParams = validate({ params: trackIdParamsSchema });
const creatorOnly = [requireAuth, requireRole("creator")];

// Listeners
router.get("/:id", idParams, trackController.getTrack);
router.get(
  "/:id/stream",
  requireAuth,
  validate({ params: trackIdParamsSchema, query: streamQuerySchema }),
  trackController.getStream
);

// Creators (own tracks)
router.post(
  "/",
  creatorOnly,
  validate({ body: creatorCreateTrackSchema }),
  trackController.createTrack
);
router.patch(
  "/:id",
  creatorOnly,
  validate({ params: trackIdParamsSchema, body: creatorUpdateTrackSchema }),
  trackController.updateMyTrack
);
router.post("/:id/publish", creatorOnly, idParams, trackController.changeMyRelease("publish"));
router.post("/:id/unpublish", creatorOnly, idParams, trackController.changeMyRelease("unpublish"));
router.delete("/:id", creatorOnly, idParams, trackController.deleteMyTrack);

export default router;
