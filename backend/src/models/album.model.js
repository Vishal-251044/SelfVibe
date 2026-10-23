/**
 * Album / EP / single (PRD §13 `albums`). Track order is the order of trackIds.
 */
import mongoose from "mongoose";
import { ALBUM_TYPES } from "../config/constants.js";

const albumSchema = new mongoose.Schema(
  {
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: "ArtistProfile", required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    type: { type: String, enum: ALBUM_TYPES, default: "album" },
    coverUrl: { type: String, default: null },
    releaseDate: { type: Date, default: null },
    trackIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Track" }], default: [] },
    createdByStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

albumSchema.index({ artistId: 1, releaseDate: -1 });

export const Album = mongoose.model("Album", albumSchema);
