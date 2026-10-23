/**
 * BulkImport: one admin bulk upload (PRD MUS-2) — the uploaded files, the
 * optional CSV, and the per-row result so failed rows can be retried.
 */
import mongoose from "mongoose";

const bulkFileSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    audioKey: { type: String, required: true },
  },
  { _id: false }
);

const bulkRowResultSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    row: { type: Number, default: null }, // CSV row number (1 = first data row)
    status: { type: String, enum: ["created", "failed"], required: true },
    trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track", default: null },
    title: { type: String, default: null },
    error: { type: String, default: null },
  },
  { _id: false }
);

const bulkImportSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["queued", "running", "done", "failed"], default: "queued" },
    files: { type: [bulkFileSchema], default: [] },
    csvText: { type: String, default: null },
    defaults: {
      artistId: { type: mongoose.Schema.Types.ObjectId, ref: "ArtistProfile", default: null },
      genres: { type: [String], default: [] },
      vibes: { type: [String], default: [] },
      releaseIntent: { type: String, default: "publish" },
      scheduledAt: { type: Date, default: null },
    },
    results: { type: [bulkRowResultSchema], default: [] },
    error: { type: String, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bulkImportSchema.index({ createdBy: 1, createdAt: -1 });

export const BulkImport = mongoose.model("BulkImport", bulkImportSchema);
