/**
 * TasteProfile: per-user taste vector used by the recommendation engine
 * (PRD §10.4, §13 `tasteProfiles`). Each map holds tag → weight, seeded by
 * the onboarding quiz and updated from listening signals.
 */
import mongoose from "mongoose";

const weightMap = { type: Map, of: Number, default: () => new Map() };

const tasteProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    genreWeights: weightMap,
    vibeWeights: weightMap,
    artistWeights: weightMap,
    moodWeights: weightMap,
    energyPref: { type: Number, min: 0, max: 1, default: 0.5 }, // preferred energy band
  },
  { timestamps: true }
);

export const TasteProfile = mongoose.model("TasteProfile", tasteProfileSchema);
