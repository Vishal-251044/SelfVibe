/**
 * Playlist routes (PRD LIB-2, roadmap Day 6): /api/playlists
 */
import { Router } from "express";
import * as playlistController from "../controllers/playlist.controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.middleware.js";
import { libraryWriteLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  addPlaylistTracksSchema,
  createPlaylistSchema,
  idParamsSchema,
  playlistTrackParamsSchema,
  reorderPlaylistSchema,
  updatePlaylistSchema,
} from "../validators/library.validator.js";

const router = Router();
const idParams = validate({ params: idParamsSchema });
const write = [requireAuth, libraryWriteLimiter];

router.get("/", requireAuth, playlistController.listMine);
router.post("/", ...write, validate({ body: createPlaylistSchema }), playlistController.create);
// Public playlists can be opened by anyone (shared links)
router.get("/:id", optionalAuth, idParams, playlistController.getOne);
router.patch(
  "/:id",
  ...write,
  validate({ params: idParamsSchema, body: updatePlaylistSchema }),
  playlistController.update
);
router.delete("/:id", ...write, idParams, playlistController.remove);
router.post(
  "/:id/tracks",
  ...write,
  validate({ params: idParamsSchema, body: addPlaylistTracksSchema }),
  playlistController.addTracks
);
router.put(
  "/:id/tracks",
  ...write,
  validate({ params: idParamsSchema, body: reorderPlaylistSchema }),
  playlistController.reorderTracks
);
router.delete(
  "/:id/tracks/:trackId",
  ...write,
  validate({ params: playlistTrackParamsSchema }),
  playlistController.removeTrack
);

export default router;
