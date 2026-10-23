/**
 * Track routes: /api/tracks
 */
import { Router } from "express";
import * as trackController from "../controllers/track.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  creatorCreateTrackSchema,
  creatorUpdateTrackSchema,
  streamQuerySchema,
  trackIdParamsSchema,
} from "../validators/track.validator.js";
import { streamBatchSchema } from "../validators/listening.validator.js";

const router = Router();
const idParams = validate({ params: trackIdParamsSchema });
// Every signed-in user can upload; the first upload creates the creator profile (PRD CRT-1).
// Edits are limited to the uploader's own tracks in the controller.
const uploaderOnly = [requireAuth];

// Listeners
// Before "/:id" so "streams" is never read as a track id
router.post(
  "/streams",
  requireAuth,
  validate({ body: streamBatchSchema }),
  trackController.getStreams
);
router.get("/:id", idParams, trackController.getTrack);
router.get(
  "/:id/stream",
  requireAuth,
  validate({ params: trackIdParamsSchema, query: streamQuerySchema }),
  trackController.getStream
);

// Uploaders (own tracks)
router.post(
  "/",
  uploaderOnly,
  validate({ body: creatorCreateTrackSchema }),
  trackController.createTrack
);
router.patch(
  "/:id",
  uploaderOnly,
  validate({ params: trackIdParamsSchema, body: creatorUpdateTrackSchema }),
  trackController.updateMyTrack
);
router.post("/:id/publish", uploaderOnly, idParams, trackController.changeMyRelease("publish"));
router.post("/:id/unpublish", uploaderOnly, idParams, trackController.changeMyRelease("unpublish"));
router.delete("/:id", uploaderOnly, idParams, trackController.deleteMyTrack);

export default router;
