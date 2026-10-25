/**
 * Admin Comments (PRD 10.9.2 Comments, 10.15, roadmap Day 9): every comment
 * across songs — reported first — with search and filters, and hide / unhide,
 * delete, pin / unpin and "reply as SelfVibe" (staff replies carry the
 * SelfVibe label, PRD CMT-2).
 */
import mongoose from "mongoose";
import { Comment } from "../../models/comment.model.js";
import { Report } from "../../models/report.model.js";
import { createComment } from "../comment.service.js";
import { buildPageMeta } from "../../helpers/genericFunctions.js";
import { ApiError } from "../../utils/ApiError.js";
import { ERROR_CODES } from "../../config/constants.js";

/**
 * Staff view of a comment.
 * @param {Object} comment - With userId / trackId populated and reportsCount
 * @returns {Object}
 */
function toAdminComment(comment) {
  return {
    id: String(comment._id),
    body: comment.body,
    status: comment.status,
    isPinned: Boolean(comment.isPinned),
    isReply: Boolean(comment.parentId),
    parentId: comment.parentId ? String(comment.parentId) : null,
    likeCount: comment.likeCount ?? 0,
    replyCount: comment.replyCount ?? 0,
    reportsCount: comment.reportsCount ?? 0,
    createdAt: comment.createdAt,
    editedAt: comment.editedAt ?? null,
    author: comment.user
      ? {
          id: String(comment.user._id),
          name: comment.user.name,
          avatar: comment.user.avatar ?? null,
          isStaff: Boolean(comment.user.staffRole),
        }
      : null,
    track: comment.track
      ? {
          id: String(comment.track._id),
          title: comment.track.title,
          coverUrl: comment.track.coverUrl ?? null,
        }
      : null,
  };
}

/**
 * List comments, reported first (open reports), then newest.
 * @param {{ q?: string, status?: string, trackId?: string, userId?: string, reported?: boolean, page: number, limit: number }} query
 * @returns {Promise<{ items: Object[], meta: Object, reportedCount: number }>}
 */
export async function listAdminComments({
  q,
  status,
  trackId,
  userId,
  reported = false,
  page = 1,
  limit = 25,
}) {
  const match = {};
  if (status) match.status = status;
  if (trackId) match.trackId = new mongoose.Types.ObjectId(trackId);
  if (userId) match.userId = new mongoose.Types.ObjectId(userId);
  if (q) match.body = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const reportCounts = await Report.aggregate([
    { $match: { targetType: "comment", status: "open" } },
    { $group: { _id: "$targetId", count: { $sum: 1 } } },
  ]);
  const reportedIds = reportCounts.map((row) => row._id);
  if (reported) match._id = { $in: reportedIds };

  const [rows, total] = await Promise.all([
    Comment.aggregate([
      { $match: match },
      {
        $addFields: {
          reportsCount: {
            $let: {
              vars: { hit: { $indexOfArray: [reportedIds, "$_id"] } },
              in: {
                $cond: [
                  { $gte: ["$$hit", 0] },
                  { $arrayElemAt: [reportCounts.map((row) => row.count), "$$hit"] },
                  0,
                ],
              },
            },
          },
        },
      },
      { $sort: { reportsCount: -1, createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { name: 1, avatar: 1, staffRole: 1 } }],
        },
      },
      {
        $lookup: {
          from: "tracks",
          localField: "trackId",
          foreignField: "_id",
          as: "track",
          pipeline: [{ $project: { title: 1, coverUrl: 1 } }],
        },
      },
      { $set: { user: { $first: "$user" }, track: { $first: "$track" } } },
    ]),
    Comment.countDocuments(match),
  ]);
  return {
    items: rows.map(toAdminComment),
    meta: buildPageMeta(total, page, limit),
    reportedCount: reportedIds.length,
  };
}

/**
 * Hide / unhide / delete / pin / unpin a comment.
 * Pinning a comment unpins any other pinned comment on the same song.
 * @param {string} commentId
 * @param {"hide"|"unhide"|"delete"|"pin"|"unpin"} action
 * @returns {Promise<{ before: Object, after: Object }>}
 * @throws {ApiError} 404, or 400 when the action doesn't apply
 */
export async function moderateComment(commentId, action) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw ApiError.notFound("Comment not found", { code: ERROR_CODES.NOT_FOUND });
  const before = { status: comment.status, isPinned: comment.isPinned };

  if (action === "hide" || action === "unhide") {
    if (comment.status === "removed") throw ApiError.badRequest("This comment was deleted");
    comment.status = action === "hide" ? "hidden" : "visible";
  } else if (action === "delete") {
    comment.status = "removed";
    comment.isPinned = false;
    if (comment.parentId)
      await Comment.updateOne(
        { _id: comment.parentId, replyCount: { $gt: 0 } },
        { $inc: { replyCount: -1 } }
      );
  } else {
    if (comment.parentId) throw ApiError.badRequest("Only top-level comments can be pinned");
    if (action === "pin" && comment.status !== "visible")
      throw ApiError.badRequest("Only visible comments can be pinned");
    if (action === "pin")
      await Comment.updateMany(
        { trackId: comment.trackId, isPinned: true },
        { $set: { isPinned: false } }
      );
    comment.isPinned = action === "pin";
  }
  await comment.save();
  // Handled: close any open reports on it
  if (["hide", "delete"].includes(action)) {
    await Report.updateMany(
      { targetType: "comment", targetId: comment._id, status: "open" },
      { $set: { status: "actioned", resolvedAt: new Date() } }
    );
  }
  return { before, after: { status: comment.status, isPinned: comment.isPinned } };
}

/**
 * Reply as SelfVibe (from the staff member's account, labelled "SelfVibe").
 * @param {string} commentId
 * @param {string} staffUserId
 * @param {string} body
 * @returns {Promise<Object>} The reply (public shape)
 */
export async function replyAsSelfVibe(commentId, staffUserId, body) {
  const comment = await Comment.findById(commentId).select("trackId parentId status").lean();
  if (!comment || comment.status !== "visible") {
    throw ApiError.notFound("That comment is no longer available", { code: ERROR_CODES.NOT_FOUND });
  }
  return createComment(String(comment.trackId), staffUserId, {
    body,
    parentId: String(comment.parentId ?? comment._id),
  });
}
