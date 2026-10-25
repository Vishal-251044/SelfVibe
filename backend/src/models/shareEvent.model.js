/**
 * ShareEvent: someone shared a song, playlist or artist link (PRD F28, roadmap
 * Day 10 share links). Song shares feed the `shares` column of trackDailyStats
 * (PRD PRF-1). Kept 90 days — older shares already live in the daily stats.
 */
import mongoose from "mongoose";
import { SHARE_CHANNELS, SHARE_TARGET_TYPES } from "../config/constants.js";

const SHARE_EVENT_TTL_SECONDS = 90 * 24 * 60 * 60;

const shareEventSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: SHARE_TARGET_TYPES, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    channel: { type: String, enum: SHARE_CHANNELS, default: "native" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

shareEventSchema.index({ targetType: 1, createdAt: -1 });
shareEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: SHARE_EVENT_TTL_SECONDS });

export const ShareEvent = mongoose.model("ShareEvent", shareEventSchema);
