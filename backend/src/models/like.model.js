/**
 * Like: a user liking a track (PRD §13 `likes`). One like per user per track.
 */
import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

likeSchema.index({ userId: 1, trackId: 1 }, { unique: true });
likeSchema.index({ userId: 1, createdAt: -1 }); // Liked Songs, newest first

export const Like = mongoose.model("Like", likeSchema);
