/**
 * Playlist: user-made or system-generated (e.g. Daily Mix) list of tracks
 * (PRD §13 `playlists`). Track order is the array order.
 */
import mongoose from "mongoose";
import { PLAYLIST_TYPES } from "../config/constants.js";

const playlistTrackSchema = new mongoose.Schema(
  {
    trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const playlistSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    coverUrl: { type: String, default: null },
    coverKey: { type: String, default: null }, // storage key behind coverUrl (for cleanup)
    isPublic: { type: Boolean, default: false },
    type: { type: String, enum: PLAYLIST_TYPES, default: "user" },
    tracks: { type: [playlistTrackSchema], default: [] },
  },
  { timestamps: true }
);

playlistSchema.index({ ownerId: 1, updatedAt: -1 });
playlistSchema.index({ "tracks.trackId": 1 }); // "which playlists contain this song"

export const Playlist = mongoose.model("Playlist", playlistSchema);
