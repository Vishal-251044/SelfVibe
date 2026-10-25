/**
 * TrackDailyStats: one song's numbers for one day (PRD PRF-1, §13 trackDailyStats).
 * Built every hour from listenEvents, likes, playlist adds and comments, so the
 * Song performance pages and creator analytics load fast. `date` is the
 * calendar day in STATS_TIMEZONE, as "YYYY-MM-DD".
 */
import mongoose from "mongoose";

const trackDailyStatsSchema = new mongoose.Schema(
  {
    trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    plays: { type: Number, default: 0 },
    uniqueListeners: { type: Number, default: 0 },
    listenPctSum: { type: Number, default: 0 }, // Σ percent heard (average = sum / measured)
    listenPctCount: { type: Number, default: 0 }, // plays with a known percent
    completes: { type: Number, default: 0 },
    skips: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    saves: { type: Number, default: 0 }, // added to a playlist
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    sources: { type: Map, of: Number, default: () => new Map() }, // feed, search, voice, playlist…
    devices: { type: Map, of: Number, default: () => new Map() }, // mobile, tablet, desktop
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

trackDailyStatsSchema.index({ trackId: 1, date: 1 }, { unique: true });
trackDailyStatsSchema.index({ date: 1 });

export const TrackDailyStats = mongoose.model("TrackDailyStats", trackDailyStatsSchema);
