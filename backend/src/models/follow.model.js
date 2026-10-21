/**
 * Follow: a user following an artist (PRD §13 `follows`). One follow per pair.
 */
import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: "ArtistProfile", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

followSchema.index({ userId: 1, artistId: 1 }, { unique: true });
followSchema.index({ artistId: 1 }); // follower lists and counts

export const Follow = mongoose.model("Follow", followSchema);
