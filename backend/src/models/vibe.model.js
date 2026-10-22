/**
 * Vibe: use-case / mood category (Chill, Focus, Code …) used for browse,
 * tagging and taste profiles (PRD BRW-2).
 */
import mongoose from "mongoose";
import { createTaxonomySchema } from "./taxonomy.schema.js";

export const Vibe = mongoose.model("Vibe", createTaxonomySchema());
