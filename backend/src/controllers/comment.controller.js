/**
 * Comment endpoints (PRD 10.15.1, roadmap Day 6):
 * GET/POST /api/tracks/:id/comments, GET /api/comments/:id/replies,
 * PATCH/DELETE /api/comments/:id, POST/DELETE /api/comments/:id/like,
 * POST /api/comments/:id/report
 */
import * as commentService from "../services/comment.service.js";
import { createReport } from "../services/report.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** GET /api/tracks/:id/comments?sort=newest|top (guests can read) */
export const list = asyncHandler(async (req, res) => {
  const result = await commentService.listComments(
    req.params.id,
    req.auth?.userId ?? null,
    req.validated.query
  );
  return sendSuccess(res, { message: "Comments fetched", data: result });
});

/** GET /api/comments/:id/replies */
export const listReplies = asyncHandler(async (req, res) => {
  const replies = await commentService.listReplies(req.params.id, req.auth?.userId ?? null);
  return sendSuccess(res, { message: "Replies fetched", data: { replies } });
});

/** POST /api/tracks/:id/comments */
export const create = asyncHandler(async (req, res) => {
  const comment = await commentService.createComment(
    req.params.id,
    req.auth.userId,
    req.validated.body
  );
  return sendSuccess(res, { statusCode: 201, message: "Comment posted", data: { comment } });
});

/** PATCH /api/comments/:id — own comments only */
export const update = asyncHandler(async (req, res) => {
  const comment = await commentService.updateComment(
    req.params.id,
    req.auth.userId,
    req.validated.body.body
  );
  return sendSuccess(res, { message: "Comment updated", data: { comment } });
});

/** DELETE /api/comments/:id — own comments only */
export const remove = asyncHandler(async (req, res) => {
  await commentService.deleteComment(req.params.id, req.auth.userId);
  return sendSuccess(res, { message: "Comment deleted" });
});

/** POST | DELETE /api/comments/:id/like */
export const setLike = (like) =>
  asyncHandler(async (req, res) => {
    const result = await commentService.setCommentLike(req.params.id, req.auth.userId, like);
    return sendSuccess(res, { message: like ? "Comment liked" : "Like removed", data: result });
  });

/** POST /api/comments/:id/report — goes to the moderation queue (CMT-3) */
export const report = asyncHandler(async (req, res) => {
  const created = await createReport(req.auth.userId, {
    targetType: "comment",
    targetId: req.params.id,
    ...req.validated.body,
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Thanks — our team will review this.",
    data: { reportId: String(created._id) },
  });
});
