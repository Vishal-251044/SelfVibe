/**
 * Library routes (PRD API list, roadmap Day 6), mounted at /api:
 * POST/DELETE /likes/:trackId · GET /likes · GET /likes/ids
 * POST/DELETE /follow/:artistId · GET /follows · GET /follows/ids
 */
import { Router } from "express";
import * as libraryController from "../controllers/library.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { libraryWriteLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  artistIdParamsSchema,
  pageQuerySchema,
  trackIdParamsSchema,
} from "../validators/library.validator.js";

const router = Router();
const trackParams = validate({ params: trackIdParamsSchema });
const artistParams = validate({ params: artistIdParamsSchema });
const pageQuery = validate({ query: pageQuerySchema });

router.get("/likes", requireAuth, pageQuery, libraryController.listLikes);
router.get("/likes/ids", requireAuth, libraryController.listLikeIds);
router.post(
  "/likes/:trackId",
  requireAuth,
  libraryWriteLimiter,
  trackParams,
  libraryController.likeTrack
);
router.delete(
  "/likes/:trackId",
  requireAuth,
  libraryWriteLimiter,
  trackParams,
  libraryController.unlikeTrack
);

router.get("/follows", requireAuth, pageQuery, libraryController.listFollows);
router.get("/follows/ids", requireAuth, libraryController.listFollowIds);
router.post(
  "/follow/:artistId",
  requireAuth,
  libraryWriteLimiter,
  artistParams,
  libraryController.followArtist
);
router.delete(
  "/follow/:artistId",
  requireAuth,
  libraryWriteLimiter,
  artistParams,
  libraryController.unfollowArtist
);

export default router;
