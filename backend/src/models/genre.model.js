/**
 * Genre: music style used for browse, tagging and taste profiles (PRD BRW-1).
 */
import mongoose from "mongoose";
import { createTaxonomySchema } from "./taxonomy.schema.js";

export const Genre = mongoose.model("Genre", createTaxonomySchema());
