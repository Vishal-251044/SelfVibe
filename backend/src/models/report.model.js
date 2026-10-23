/**
 * Report: a listener flags a track (or artist) for copyright / abuse
 * (PRD §13 `reports`, F32). Reviewed in the moderation queue (Day 9).
 */
import mongoose from "mongoose";
import { REPORT_REASONS, REPORT_TARGET_TYPES } from "../config/constants.js";

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["open", "dismissed", "actioned"], default: "open" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One open report per person per item (re-reporting just updates it)
reportSchema.index(
  { reporterId: 1, targetType: 1, targetId: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model("Report", reportSchema);
