/**
 * CommentLike: a user liking a comment (PRD CMT-1). One like per user per comment.
 */
import mongoose from "mongoose";

const commentLikeSchema = new mongoose.Schema(
  {
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

commentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });
commentLikeSchema.index({ userId: 1, commentId: 1 });

export const CommentLike = mongoose.model("CommentLike", commentLikeSchema);
