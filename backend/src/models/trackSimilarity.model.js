/**
 * TrackSimilarity: "listeners who liked X also liked Y" (PRD 10.4.2 v2,
 * §13 trackSimilarities). Rebuilt nightly from likes, completed plays and
 * playlist adds; powers Similar tracks, Because you liked X and Daily Mix.
 */
import mongoose from "mongoose";

const trackSimilaritySchema = new mongoose.Schema(
  {
    trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true, unique: true },
    similar: {
      type: [
        {
          _id: false,
          trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track", required: true },
          score: { type: Number, required: true }, // cosine similarity 0–1
        },
      ],
      default: [],
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const TrackSimilarity = mongoose.model("TrackSimilarity", trackSimilaritySchema);
