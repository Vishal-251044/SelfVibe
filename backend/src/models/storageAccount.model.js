/**
 * StorageAccount: one Cloudinary account in the storage pool (PRD 10.13, STO-3).
 * Credentials live only in env (CLOUDINARY_ACCOUNTS); this document tracks the
 * account's pool, status and usage so the picker can choose where uploads go.
 */
import mongoose from "mongoose";
import { STORAGE_ACCOUNT_STATUS, STORAGE_POOLS } from "../config/constants.js";

const storageAccountSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true }, // matches CLOUDINARY_ACCOUNTS
    pool: { type: String, enum: STORAGE_POOLS, required: true },
    status: { type: String, enum: STORAGE_ACCOUNT_STATUS, default: "active" },
    quotaBytes: { type: Number, required: true, min: 1 },
    bytesUsed: { type: Number, default: 0, min: 0 }, // estimate between syncs, real value after a sync
    bandwidthBytes: { type: Number, default: 0, min: 0 },
    songCount: { type: Number, default: 0, min: 0 },
    lastSyncAt: { type: Date, default: null },
    lastSyncError: { type: String, default: null },
  },
  { timestamps: true }
);

storageAccountSchema.index({ pool: 1, status: 1 });

export const StorageAccount = mongoose.model("StorageAccount", storageAccountSchema);
