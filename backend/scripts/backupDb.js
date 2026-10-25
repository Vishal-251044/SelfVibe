/**
 * Database backup (roadmap Day 10 "backups on"): writes every collection to
 * backend/backups/<date-time>/<collection>.jsonl.gz as canonical Extended JSON
 * (one document per line, ObjectIds and dates kept exactly).
 * For the free Atlas tier, which has no automatic backups; on Flex / M10+
 * clusters turn on Atlas backups instead (see the deployment guide).
 *
 * Run: npm run db:backup                (all collections)
 *      npm run db:backup -- users tracks (only these)
 * Restore one collection (MongoDB Database Tools):
 *   gunzip users.jsonl.gz && mongoimport --uri "<DATABASE_URL>" --collection users --file users.jsonl
 * Backups contain personal data: keep them private and never commit them.
 */
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import { env, isUnset } from "../src/config/env.js";
import { logger } from "../src/utils/logger.js";

const BACKUP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../backups");
const { EJSON } = mongoose.mongo.BSON;

/**
 * Stream one collection to a gzip file.
 * @param {import("mongodb").Collection} collection
 * @param {string} folder
 * @returns {Promise<number>} Documents written
 */
async function backupCollection(collection, folder) {
  let count = 0;
  const cursor = collection.find({}, { batchSize: 500 });
  const lines = Readable.from(
    (async function* toLines() {
      for await (const doc of cursor) {
        count += 1;
        yield `${EJSON.stringify(doc, { relaxed: false })}\n`;
      }
    })()
  );
  await pipeline(
    lines,
    createGzip(),
    createWriteStream(path.join(folder, `${collection.collectionName}.jsonl.gz`))
  );
  return count;
}

/** @returns {Promise<void>} */
async function run() {
  if (isUnset(env.databaseUrl)) throw new Error("DATABASE_URL is not set in backend/.env");
  await mongoose.connect(env.databaseUrl, { serverSelectionTimeoutMS: 15000 });

  const wanted = process.argv.slice(2);
  const folder = path.join(BACKUP_ROOT, new Date().toISOString().replace(/[:.]/g, "-"));
  await mkdir(folder, { recursive: true });

  const collections = (await mongoose.connection.db.collections()).filter(
    (collection) => wanted.length === 0 || wanted.includes(collection.collectionName)
  );
  for (const collection of collections) {
    const count = await backupCollection(collection, folder);
    logger.info(`[Backup] ${collection.collectionName}: ${count} documents`);
  }
  logger.info(`[Backup] done → ${folder}`);
}

run()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error(`[Backup] ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
