/**
 * Track routes: /api/tracks
 */
import { Router } from "express";
import * as trackController from "../controllers/track.controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.middleware.js";
import { commentLimiter } from "../middlewares/rateLimit.middleware.js";
import * as commentController from "../controllers/comment.controller.js";
import { createCommentSchema, listCommentsQuerySchema } from "../validators/library.validator.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  creatorCreateTrackSchema,
  creatorUpdateTrackSchema,
  streamQuerySchema,
  trackIdParamsSchema,
} from "../validators/track.validator.js";
import { streamBatchSchema } from "../validators/listening.validator.js";
import { requireFeature } from "../middlewares/platform.middleware.js";
import * as feedController from "../controllers/feed.controller.js";
import { similarQuerySchema } from "../validators/adminPlatform.validator.js";

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
// Similar tracks (Day 9): co-listened songs, then tag matches
router.get(
  "/:id/similar",
  validate({ params: trackIdParamsSchema, query: similarQuerySchema }),
  feedController.similar
);

// Comments (PRD CMT-1): anyone can read, signed-in users post (10 per 10 min, CMT-3)
router.get(
  "/:id/comments",
  optionalAuth,
  validate({ params: trackIdParamsSchema, query: listCommentsQuerySchema }),
  commentController.list
);
router.post(
  "/:id/comments",
  requireAuth,
  requireFeature("comments"),
  commentLimiter,
  validate({ params: trackIdParamsSchema, body: createCommentSchema }),
  commentController.create
);
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
  requireFeature("uploads"),
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
