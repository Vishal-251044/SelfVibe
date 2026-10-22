/**
 * Seed the genres and vibes collections.
 * Run with: npm run seed:taxonomy
 *
 * Idempotent: only missing slugs are inserted. Existing entries are never
 * overwritten, so edits made later in the admin console are kept.
 */
import mongoose from "mongoose";
import { env, isUnset } from "../src/config/env.js";
import { Genre } from "../src/models/genre.model.js";
import { Vibe } from "../src/models/vibe.model.js";
import { logger } from "../src/utils/logger.js";
import { GENRES, VIBES } from "./data/taxonomy.js";

/**
 * Insert any entries whose slug is not in the collection yet.
 * @param {mongoose.Model} Model
 * @param {Object[]} entries
 * @returns {Promise<{ inserted: number, existing: number }>}
 */
async function upsertMissing(Model, entries) {
  const operations = entries.map((entry, index) => ({
    updateOne: {
      filter: { slug: entry.slug },
      update: { $setOnInsert: { ...entry, order: index, active: true } },
      upsert: true,
    },
  }));
  const result = await Model.bulkWrite(operations, { ordered: false });
  return { inserted: result.upsertedCount, existing: entries.length - result.upsertedCount };
}

/** @returns {Promise<void>} */
async function seed() {
  if (isUnset(env.databaseUrl)) throw new Error("DATABASE_URL is not set in backend/.env");
  await mongoose.connect(env.databaseUrl, { serverSelectionTimeoutMS: 15000 });
  await Promise.all([Genre.init(), Vibe.init()]); // make sure the unique slug indexes exist

  const genres = await upsertMissing(Genre, GENRES);
  const vibes = await upsertMissing(Vibe, VIBES);

  logger.info(
    `[SeedTaxonomy] genres: ${genres.inserted} added, ${genres.existing} already there · vibes: ${vibes.inserted} added, ${vibes.existing} already there`
  );
}

seed()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error(`[SeedTaxonomy] ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
