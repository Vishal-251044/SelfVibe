/**
 * Shared schema for browse categories (genres and vibes): PRD §13 `genres / vibes`
 * — name, slug, icon, colour, order, active. Staff manage them on Day 7.
 */
import mongoose from "mongoose";

/**
 * Build a taxonomy schema.
 * @returns {mongoose.Schema}
 */
export function createTaxonomySchema() {
  const schema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 40 },
      slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[a-z0-9-]+$/,
      },
      icon: { type: String, default: "Music2", maxlength: 40 }, // lucide icon name
      colour: { type: String, default: "#22C55E", match: /^#[0-9a-fA-F]{6}$/ },
      description: { type: String, trim: true, maxlength: 120, default: "" },
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true }
  );

  schema.index({ active: 1, order: 1 });
  return schema;
}
