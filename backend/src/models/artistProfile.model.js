/**
 * ArtistProfile: public artist page (PRD §13 `artistProfiles`).
 * Linked to a creator's user account, or created by staff for official
 * artists that have no account (userId is then null).
 */
import mongoose from "mongoose";

const artistProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    stageName: { type: String, required: true, trim: true, maxlength: 80 },
    bio: { type: String, trim: true, maxlength: 1000, default: "" },
    avatar: { type: String, default: null },
    banner: { type: String, default: null },
    socials: {
      instagram: { type: String, trim: true },
      youtube: { type: String, trim: true },
      spotify: { type: String, trim: true },
      x: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    verified: { type: Boolean, default: false },
    createdByStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    followersCount: { type: Number, default: 0, min: 0 },
    monthlyListeners: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One artist profile per user account; official artists (userId null) are not constrained
artistProfileSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } }
);
artistProfileSchema.index({ stageName: 1 });

export const ArtistProfile = mongoose.model("ArtistProfile", artistProfileSchema);
