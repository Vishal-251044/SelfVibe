/**
 * Setting: one platform setting (PRD §13 settings) — feature flags, maintenance
 * mode, upload limits, admin IP allowlist. Only the Owner changes them; the
 * defaults live in SETTINGS_DEFAULTS, so a missing row means "default".
 */
import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const Setting = mongoose.model("Setting", settingSchema);
