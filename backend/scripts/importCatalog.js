/**
 * Import a royalty-free starter catalog (roadmap Day 4: "100+ tracks").
 * Run with: npm run import:catalog            (100 tracks)
 *   (the npm script raises Node's header limit: ccMixter sends ~70 KB of response headers)
 *           npm run import:catalog -- --limit 30
 *           npm run import:catalog -- --per-genre 10   (top 10 of every genre)
 *
 * Sources: ccMixter (CC BY, no key) and Jamendo (when JAMENDO_CLIENT_ID is set).
 * Tracks are credited to official artists, keep their licence + source link,
 * and go through the normal processing pipeline. Safe to run again: tracks
 * already imported are skipped.
 *
 * Needs: DATABASE_URL, an Owner account (`npm run create-owner`), seeded
 * genres/vibes (`npm run seed:taxonomy`). With REDIS_URL set, keep
 * `npm run worker` running so the tracks get processed.
 */
import mongoose from "mongoose";
import { env, isUnset } from "../src/config/env.js";
import "../src/models/index.js";
import { User } from "../src/models/user.model.js";
import { Track } from "../src/models/track.model.js";
import { queue } from "../src/services/queue/index.js";
import { processTrackJob } from "../src/services/trackProcessing.service.js";
import { importCatalog } from "../src/services/catalogImport/catalogImport.service.js";
import { JOBS } from "../src/config/constants.js";
import { logger } from "../src/utils/logger.js";

const DEFAULT_LIMIT = 100;
const PROCESSING_TIMEOUT_MS = 60 * 60 * 1000;
const POLL_EVERY_MS = 5000;

/**
 * Read a whole-number option such as `--limit 30` from the command line.
 * @param {string} flag - e.g. "--limit"
 * @param {number|null} fallback - Used when the flag is missing
 * @param {number} max
 * @returns {number|null}
 * @throws {Error} When the value is not a whole number from 1 to max
 */
function readNumberOption(flag, fallback, max) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${flag} must be a whole number between 1 and ${max}`);
  }
  return value;
}

/**
 * Wait until none of the given tracks is still queued or processing.
 * @param {string[]} trackIds
 * @returns {Promise<{ done: number, failed: number, pending: number }>}
 */
async function waitForProcessing(trackIds) {
  const startedAt = Date.now();
  let lastReported = -1;
  for (;;) {
    const states = await Track.aggregate([
      { $match: { _id: { $in: trackIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: "$processing.state", count: { $sum: 1 } } },
    ]);
    const count = (state) => states.find((entry) => entry._id === state)?.count ?? 0;
    const pending = count("queued") + count("running");
    if (pending === 0 || Date.now() - startedAt > PROCESSING_TIMEOUT_MS) {
      return { done: count("done"), failed: count("failed"), pending };
    }
    if (pending !== lastReported) {
      logger.info(
        `[ImportCatalog] processing… ${trackIds.length - pending}/${trackIds.length} finished`
      );
      lastReported = pending;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_EVERY_MS));
  }
}

/** @returns {Promise<void>} */
async function run() {
  const limit = readNumberOption("--limit", DEFAULT_LIMIT, 1000);
  const perGenre = readNumberOption("--per-genre", null, 50);
  if (isUnset(env.databaseUrl)) throw new Error("DATABASE_URL is not set in backend/.env");
  await mongoose.connect(env.databaseUrl, { serverSelectionTimeoutMS: 15000 });

  const owner = await User.findOne({ staffRole: "owner" }).select("_id");
  if (!owner) throw new Error("No Owner account yet — run `npm run create-owner` first");

  // Without Redis, process the tracks right here (the API's in-process queue is not shared)
  if (env.queue.driver === "memory") {
    queue.registerProcessors({ [JOBS.processTrack]: processTrackJob });
  } else {
    logger.info("[ImportCatalog] using Redis — make sure `npm run worker` is running");
  }

  logger.info(
    `[ImportCatalog] importing ${perGenre ? `the top ${perGenre} tracks of every genre` : `up to ${limit} tracks`} (${env.catalog.jamendoClientId ? "ccMixter + Jamendo" : "ccMixter; set JAMENDO_CLIENT_ID to add Jamendo"}) into ${env.storage.driver} storage`
  );
  const { created, skipped, failed } = await importCatalog({
    limit: perGenre ? Infinity : limit,
    perGenre,
    ownerId: String(owner._id),
  });
  logger.info(
    `[ImportCatalog] ${created.length} tracks created, ${skipped} already imported, ${failed.length} failed to download`
  );

  if (created.length > 0) {
    const result = await waitForProcessing(created);
    logger.info(
      `[ImportCatalog] processing finished: ${result.done} ready, ${result.failed} failed${result.pending ? `, ${result.pending} still waiting (is the worker running?)` : ""}`
    );
  }
  const total = await Track.countDocuments({ status: "published" });
  logger.info(`[ImportCatalog] the catalog now has ${total} published tracks`);
}

run()
  .then(async () => {
    await queue.close();
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    logger.error(`[ImportCatalog] ${error.message}`);
    await queue.close().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
