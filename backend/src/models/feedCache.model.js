/**
 * FeedCache: a user's pre-computed For You sections (PRD 10.4.4, §13 `feedCache`).
 * Stores song ids and the "why this?" reasons only — songs are loaded fresh
 * on every read, so edits and take-downs show at once. Expires after 1 hour
 * (TTL index) or is dropped early after enough new taste signals.
 */
import mongoose from "mongoose";
import { CATALOG_FILTERS } from "../config/constants.js";

const feedItemSchema = new mongoose.Schema(
  {
    trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
    reason: { type: String, default: "" }, // e.g. "Because you like Lo-fi"
  },
  { _id: false }
);

const feedSectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // madeForYou, rightNow, trending, freshCreators
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    vibe: { type: String, default: null }, // "Right now: <vibe>"
    items: { type: [feedItemSchema], default: [] },
  },
  { _id: false }
);

const feedCacheSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    catalog: { type: String, enum: CATALOG_FILTERS, required: true },
    dayPart: { type: Number, required: true }, // index into RIGHT_NOW_VIBES — rebuilt when it changes
    sections: { type: [feedSectionSchema], default: [] },
    signalsSince: { type: Number, default: 0 }, // taste signals since it was built
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

feedCacheSchema.index({ userId: 1, catalog: 1 }, { unique: true });
feedCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const FeedCache = mongoose.model("FeedCache", feedCacheSchema);
