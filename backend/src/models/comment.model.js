/**
 * Comment: a listener's comment on a song, or a reply to one (PRD 10.15.1).
 * Replies are one level deep (parentId points to a top-level comment).
 * `status` lets staff hide or remove comments later (PRD 10.15.2) without
 * losing the thread structure.
 */
import mongoose from "mongoose";
import { COMMENT_MAX_LENGTH, COMMENT_STATUS } from "../config/constants.js";

const commentSchema = new mongoose.Schema(
  {
    trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    body: { type: String, required: true, trim: true, maxlength: COMMENT_MAX_LENGTH },
    likeCount: { type: Number, default: 0, min: 0 },
    replyCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: COMMENT_STATUS, default: "visible" },
    isPinned: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Newest / top lists for a song, and replies under a comment
commentSchema.index({ trackId: 1, parentId: 1, status: 1, createdAt: -1 });
commentSchema.index({ trackId: 1, parentId: 1, status: 1, likeCount: -1 });
commentSchema.index({ parentId: 1, createdAt: 1 });
// Duplicate-comment check (spam filter)
commentSchema.index({ userId: 1, createdAt: -1 });

export const Comment = mongoose.model("Comment", commentSchema);
