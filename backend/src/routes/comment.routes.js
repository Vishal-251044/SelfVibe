/**
 * Comment routes (PRD API list, roadmap Day 6): /api/comments
 * (listing and posting on a song live under /api/tracks/:id/comments)
 */
import { Router } from "express";
import * as commentController from "../controllers/comment.controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.middleware.js";
import { libraryWriteLimiter, reportLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  idParamsSchema,
  reportCommentSchema,
  updateCommentSchema,
} from "../validators/library.validator.js";

const router = Router();
const idParams = validate({ params: idParamsSchema });

router.get("/:id/replies", optionalAuth, idParams, commentController.listReplies);
router.patch(
  "/:id",
  requireAuth,
  libraryWriteLimiter,
  validate({ params: idParamsSchema, body: updateCommentSchema }),
  commentController.update
);
router.delete("/:id", requireAuth, libraryWriteLimiter, idParams, commentController.remove);
router.post(
  "/:id/like",
  requireAuth,
  libraryWriteLimiter,
  idParams,
  commentController.setLike(true)
);
router.delete(
  "/:id/like",
  requireAuth,
  libraryWriteLimiter,
  idParams,
  commentController.setLike(false)
);
router.post(
  "/:id/report",
  requireAuth,
  reportLimiter,
  validate({ params: idParamsSchema, body: reportCommentSchema }),
  commentController.report
);

export default router;
