/**
 * ListenEvent: one logged playback action — play, skip, complete or repeat
 * (PRD §13 `listenEvents`). Feeds history and the recommendation engine.
 * Events expire automatically after 180 days.
 */
import mongoose from "mongoose";
import { LISTEN_EVENT_TTL_SECONDS, LISTEN_EVENT_TYPES } from "../config/constants.js";

const listenEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
    type: { type: String, enum: LISTEN_EVENT_TYPES, required: true },
    // One listening session on the client (start + end share it) — makes re-sent batches harmless
    sessionId: { type: String, required: true },
    msListened: { type: Number, default: 0, min: 0 },
    percent: { type: Number, default: 0, min: 0, max: 100 },
    context: {
      source: { type: String, default: null }, // e.g. "feed", "search", "playlist"
      hour: { type: Number, min: 0, max: 23, default: null },
      device: { type: String, default: null },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

listenEventSchema.index({ userId: 1, createdAt: -1 }); // history, taste updates (roadmap Day 5)
listenEventSchema.index({ sessionId: 1, type: 1 }, { unique: true }); // idempotent batches
listenEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: LISTEN_EVENT_TTL_SECONDS });

export const ListenEvent = mongoose.model("ListenEvent", listenEventSchema);
