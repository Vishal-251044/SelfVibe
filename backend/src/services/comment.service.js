/**
 * Comments on songs (PRD 10.15.1, CMT-1–3, roadmap Day 6):
 * - any signed-in user comments on any published song (Official or Community),
 *   replies one level deep, likes comments, edits / deletes their own
 * - newest / top sort; pinned comments first
 * - "Artist" label for the song's artist, "SelfVibe" for staff accounts
 * - spam / abuse filter (blocked words, links, floods, repeats); the
 *   10-per-10-minutes limit is a route middleware; reports go to the admin queue
 */
import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { CommentLike } from "../models/commentLike.model.js";
import { Track } from "../models/track.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { checkCommentContent } from "../utils/contentFilter.js";
import { buildPageMeta, getPagination } from "../helpers/genericFunctions.js";
import { COMMENT_RATE_LIMIT, ERROR_CODES } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";

const AUTHOR_FIELDS = "name avatar staffRole";
const DUPLICATE_KEY = 11000;

/** @returns {ApiError} */
const commentNotFound = () =>
  ApiError.notFound("Comment not found", { code: ERROR_CODES.NOT_FOUND });

/**
 * A published song (comments only exist on live songs), with its artist's account.
 * @param {string} trackId
 * @returns {Promise<{ _id: Object, artistUserId: string|null }>}
 */
async function getCommentableTrack(trackId) {
  const track = mongoose.isValidObjectId(trackId)
    ? await Track.findOne({ _id: trackId, status: "published" }).select("artistId").lean()
    : null;
  if (!track) throw ApiError.notFound("This song isn't available", { code: ERROR_CODES.NOT_FOUND });
  const artist = await ArtistProfile.findById(track.artistId).select("userId").lean();
  return { _id: track._id, artistUserId: artist?.userId ? String(artist.userId) : null };
}

/**
 * Reject abusive or spammy text with a clear message.
 * @param {string} userId
 * @param {string} body
 * @param {string|null} [ignoreCommentId] - When editing, the comment itself
 * @returns {Promise<void>}
 */
async function assertAllowedText(userId, body, ignoreCommentId = null) {
  const check = checkCommentContent(body);
  if (!check.ok) throw ApiError.badRequest(check.reason, { fields: { body: check.reason } });
  const since = new Date(Date.now() - COMMENT_RATE_LIMIT.windowMs);
  const isRepeat = await Comment.exists({
    userId,
    body,
    createdAt: { $gte: since },
    ...(ignoreCommentId && { _id: { $ne: ignoreCommentId } }),
  });
  if (isRepeat) {
    throw ApiError.badRequest("You just posted that. Try saying something new.", {
      fields: { body: "Duplicate comment" },
    });
  }
}

/**
 * Comment as clients see it.
 * @param {Object} comment - Lean comment with userId populated
 * @param {{ artistUserId: string|null, likedIds: Set<string> }} context
 * @returns {Object}
 */
export function toPublicComment(comment, { artistUserId, likedIds }) {
  const author = comment.userId;
  const authorId = String(author?._id ?? author);
  const isRemoved = comment.status === "removed";
  let label = null;
  if (author?.staffRole) label = "selfvibe";
  else if (artistUserId && authorId === artistUserId) label = "artist";
  return {
    id: String(comment._id),
    trackId: String(comment.trackId),
    parentId: comment.parentId ? String(comment.parentId) : null,
    body: isRemoved ? null : comment.body,
    isRemoved,
    author: isRemoved
      ? null
      : { id: authorId, name: author?.name ?? "SelfVibe listener", avatar: author?.avatar ?? null },
    label, // "artist" | "selfvibe" | null (PRD CMT-2)
    likeCount: comment.likeCount ?? 0,
    replyCount: comment.replyCount ?? 0,
    likedByMe: likedIds.has(String(comment._id)),
    isPinned: Boolean(comment.isPinned),
    editedAt: comment.editedAt ?? null,
    createdAt: comment.createdAt,
  };
}

/**
 * Which of these comments the viewer liked.
 * @param {string|null} viewerId
 * @param {Object[]} comments
 * @returns {Promise<Set<string>>}
 */
async function likedByViewer(viewerId, comments) {
  if (!viewerId || comments.length === 0) return new Set();
  const likes = await CommentLike.find({
    userId: viewerId,
    commentId: { $in: comments.map((comment) => comment._id) },
  })
    .select("commentId")
    .lean();
  return new Set(likes.map((like) => String(like.commentId)));
}

/**
 * Top-level comments on a song, pinned first, then newest or top.
 * Deleted comments that still have replies stay as "Comment deleted".
 * @param {string} trackId
 * @param {string|null} viewerId
 * @param {{ sort?: "newest"|"top", page?: number, limit?: number }} query
 * @returns {Promise<{ comments: Object[], meta: Object, total: number }>}
 */
export async function listComments(trackId, viewerId, query) {
  const track = await getCommentableTrack(trackId);
  const { page, limit, skip } = getPagination(query);
  const where = {
    trackId: track._id,
    parentId: null,
    $or: [{ status: "visible" }, { status: "removed", replyCount: { $gt: 0 } }],
  };
  const sort =
    query.sort === "top"
      ? { isPinned: -1, likeCount: -1, createdAt: -1 }
      : { isPinned: -1, createdAt: -1 };
  const [comments, pageTotal, total] = await Promise.all([
    Comment.find(where).sort(sort).skip(skip).limit(limit).populate("userId", AUTHOR_FIELDS).lean(),
    Comment.countDocuments(where),
    Comment.countDocuments({ trackId: track._id, status: "visible" }),
  ]);
  const likedIds = await likedByViewer(viewerId, comments);
  return {
    comments: comments.map((comment) =>
      toPublicComment(comment, { artistUserId: track.artistUserId, likedIds })
    ),
    meta: buildPageMeta(pageTotal, page, limit),
    total, // all visible comments incl. replies (for "24 comments")
  };
}

/**
 * Replies under a comment, oldest first (conversation order).
 * @param {string} commentId
 * @param {string|null} viewerId
 * @returns {Promise<Object[]>}
 */
export async function listReplies(commentId, viewerId) {
  if (!mongoose.isValidObjectId(commentId)) throw commentNotFound();
  const parent = await Comment.findOne({ _id: commentId, parentId: null }).lean();
  if (!parent) throw commentNotFound();
  const track = await getCommentableTrack(String(parent.trackId));
  const replies = await Comment.find({ parentId: parent._id, status: "visible" })
    .sort({ createdAt: 1 })
    .limit(200)
    .populate("userId", AUTHOR_FIELDS)
    .lean();
  const likedIds = await likedByViewer(viewerId, replies);
  return replies.map((reply) =>
    toPublicComment(reply, { artistUserId: track.artistUserId, likedIds })
  );
}

/**
 * Post a comment or a reply.
 * @param {string} trackId
 * @param {string} userId
 * @param {{ body: string, parentId?: string|null }} input
 * @returns {Promise<Object>} The new comment (public shape)
 */
export async function createComment(trackId, userId, { body, parentId = null }) {
  const track = await getCommentableTrack(trackId);
  let parent = null;
  if (parentId) {
    parent = mongoose.isValidObjectId(parentId)
      ? await Comment.findOne({ _id: parentId, trackId: track._id, status: "visible" }).lean()
      : null;
    if (!parent) throw ApiError.badRequest("That comment is no longer available");
    // Replies stay one level deep: replying to a reply joins the same thread
    if (parent.parentId) parent = await Comment.findById(parent.parentId).lean();
  }
  await assertAllowedText(userId, body);

  const comment = await Comment.create({
    trackId: track._id,
    userId,
    parentId: parent?._id ?? null,
    body,
  });
  if (parent) await Comment.updateOne({ _id: parent._id }, { $inc: { replyCount: 1 } });
  const populated = await Comment.findById(comment._id).populate("userId", AUTHOR_FIELDS).lean();
  return toPublicComment(populated, { artistUserId: track.artistUserId, likedIds: new Set() });
}

/**
 * The user's own visible comment, or 404.
 * @param {string} commentId
 * @param {string} userId
 * @returns {Promise<Object>} Mongoose document
 */
async function getOwnComment(commentId, userId) {
  if (!mongoose.isValidObjectId(commentId)) throw commentNotFound();
  const comment = await Comment.findOne({ _id: commentId, userId, status: "visible" });
  if (!comment) throw commentNotFound();
  return comment;
}

/**
 * Edit your own comment.
 * @param {string} commentId
 * @param {string} userId
 * @param {string} body
 * @returns {Promise<Object>} Public shape
 */
export async function updateComment(commentId, userId, body) {
  const comment = await getOwnComment(commentId, userId);
  if (comment.body !== body) {
    await assertAllowedText(userId, body, comment._id);
    comment.body = body;
    comment.editedAt = new Date();
    await comment.save();
  }
  const track = await getCommentableTrack(String(comment.trackId));
  const populated = await Comment.findById(comment._id).populate("userId", AUTHOR_FIELDS).lean();
  const likedIds = await likedByViewer(userId, [populated]);
  return toPublicComment(populated, { artistUserId: track.artistUserId, likedIds });
}

/**
 * Delete your own comment. A comment with replies becomes "Comment deleted"
 * so the conversation under it still makes sense.
 * @param {string} commentId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteComment(commentId, userId) {
  const comment = await getOwnComment(commentId, userId);
  if (!comment.parentId && comment.replyCount > 0) {
    comment.status = "removed";
    await comment.save();
    return;
  }
  await Comment.deleteOne({ _id: comment._id });
  await CommentLike.deleteMany({ commentId: comment._id });
  if (comment.parentId) {
    const parent = await Comment.findOneAndUpdate(
      { _id: comment.parentId, replyCount: { $gt: 0 } },
      { $inc: { replyCount: -1 } },
      { returnDocument: "after" }
    );
    // A deleted parent with no replies left disappears completely
    if (parent?.status === "removed" && parent.replyCount === 0) await parent.deleteOne();
  }
}

/**
 * Like / unlike a comment (idempotent).
 * @param {string} commentId
 * @param {string} userId
 * @param {boolean} like
 * @returns {Promise<{ liked: boolean, likeCount: number }>}
 */
export async function setCommentLike(commentId, userId, like) {
  if (!mongoose.isValidObjectId(commentId)) throw commentNotFound();
  const comment = await Comment.findOne({ _id: commentId, status: "visible" }).select("_id").lean();
  if (!comment) throw commentNotFound();

  if (like) {
    try {
      await CommentLike.create({ commentId, userId });
      await Comment.updateOne({ _id: commentId }, { $inc: { likeCount: 1 } });
    } catch (error) {
      if (error.code !== DUPLICATE_KEY) throw error;
    }
  } else {
    const { deletedCount } = await CommentLike.deleteOne({ commentId, userId });
    if (deletedCount) {
      await Comment.updateOne(
        { _id: commentId, likeCount: { $gt: 0 } },
        { $inc: { likeCount: -1 } }
      );
    }
  }
  const { likeCount } = await Comment.findById(commentId).select("likeCount").lean();
  return { liked: like, likeCount };
}
