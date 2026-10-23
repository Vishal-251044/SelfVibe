/**
 * Make the database indexes match the Mongoose schemas: creates missing
 * indexes and drops ones the code no longer defines (e.g. the old `title_text`
 * index on tracks, which treated the `language` field as a text-search language).
 * Run after deploying schema changes: npm run db:sync-indexes
 * Optional: npm run db:sync-indexes -- Track Album   (only these models)
 */
import mongoose from "mongoose";
import { env, isUnset } from "../src/config/env.js";
import "../src/models/index.js";
import { logger } from "../src/utils/logger.js";

/** @returns {Promise<void>} */
async function run() {
  if (isUnset(env.databaseUrl)) throw new Error("DATABASE_URL is not set in backend/.env");
  await mongoose.connect(env.databaseUrl, { serverSelectionTimeoutMS: 15000 });

  const wanted = process.argv.slice(2);
  const models = Object.values(mongoose.models).filter(
    (model) => wanted.length === 0 || wanted.includes(model.modelName)
  );
  for (const model of models) {
    const dropped = await model.syncIndexes();
    logger.info(
      `[SyncIndexes] ${model.modelName}: in sync${dropped.length ? ` (dropped ${dropped.join(", ")})` : ""}`
    );
  }
}

run()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error(`[SyncIndexes] ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
