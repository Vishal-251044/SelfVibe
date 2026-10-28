/**
 * Re-encode songs processed before the AAC renditions (one 192 kbps MP3) into
 * the 64 / 128 / 256 kbps AAC copies, from the kept original. Songs stay
 * playable the whole time: the old MP3 is only removed once the new copies
 * are saved. Safe to stop and run again — finished songs are skipped.
 *
 * Run with: npm run audio:reencode                 (every old song)
 *           npm run audio:reencode -- --dry-run     (only count and estimate)
 *           npm run audio:reencode -- --limit 200 --concurrency 3
 *
 * Needs: DATABASE_URL and the storage settings the songs live on. The work
 * runs inside this script (FFmpeg is bundled), so no worker is needed.
 */
import mongoose from "mongoose";
import { env, isUnset } from "../src/config/env.js";
import "../src/models/index.js";
import { Track } from "../src/models/track.model.js";
import {
  PROCESS_TRACK_MAX_ATTEMPTS,
  processTrackJob,
} from "../src/services/trackProcessing.service.js";
import { AUDIO_RENDITIONS } from "../src/config/constants.js";
import { formatBytes } from "../src/helpers/genericFunctions.js";
import { logger } from "../src/utils/logger.js";

const DEFAULT_CONCURRENCY = 2;
const MAX_CONCURRENCY = 6;

/** Songs that still stream an old (non-AAC) copy and have their original. */
const LEGACY_FILTER = {
  "audio.sourceKey": { $ne: null },
  "audio.formats.0": { $exists: true },
  "audio.formats.codec": { $ne: AUDIO_RENDITIONS.standard.codec },
  "processing.state": { $nin: ["queued", "running"] },
};

/**
 * Read a whole-number flag such as `--limit 200`.
 * @param {string} name
 * @param {number} fallback
 * @param {number} max
 * @returns {number}
 */
function readNumberFlag(name, fallback, max) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${name} must be a whole number between 1 and ${max}`);
  }
  return value;
}

/**
 * Most bytes a song can need with the new copies (the 256 kbps copy is
 * skipped for low-bitrate sources, so the real size is often smaller).
 * @param {number} durationSec
 * @returns {number}
 */
function estimatedNewBytes(durationSec) {
  const kbps = Object.values(AUDIO_RENDITIONS).reduce((total, r) => total + r.bitrateKbps, 0);
  return Math.round((durationSec * kbps * 1000) / 8);
}

/** @returns {Promise<void>} */
async function run() {
  const isDryRun = process.argv.includes("--dry-run");
  const limit = readNumberFlag("--limit", Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  const concurrency = readNumberFlag("--concurrency", DEFAULT_CONCURRENCY, MAX_CONCURRENCY);
  if (isUnset(env.databaseUrl)) throw new Error("DATABASE_URL is not set in backend/.env");
  await mongoose.connect(env.databaseUrl, { serverSelectionTimeoutMS: 15000 });

  const tracks = await Track.find(LEGACY_FILTER)
    .select("_id title audio.durationSec audio.formats.sizeBytes")
    .sort({ playCount: -1 }) // most-played songs get the better copies first
    .limit(limit)
    .lean();
  const oldBytes = tracks.reduce(
    (total, track) => total + track.audio.formats.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0),
    0
  );
  const newBytes = tracks.reduce((total, t) => total + estimatedNewBytes(t.audio.durationSec), 0);
  logger.info(
    `[ReencodeAudio] ${tracks.length} song(s) to re-encode — playback copies now ${formatBytes(oldBytes)}, at most ${formatBytes(newBytes)} after (originals are kept)`
  );
  if (isDryRun || tracks.length === 0) return;

  let next = 0;
  let finished = 0;
  const failed = [];
  /** One worker: takes the next song until none are left. */
  const worker = async () => {
    while (next < tracks.length) {
      const track = tracks[next++];
      // Final attempt: a failure is recorded on the song (the old copy keeps playing)
      await processTrackJob({
        data: { trackId: String(track._id) },
        attemptsMade: PROCESS_TRACK_MAX_ATTEMPTS,
      });
      const after = await Track.findById(track._id).select("processing.state").lean();
      if (after?.processing?.state === "failed") failed.push(track.title);
      finished += 1;
      if (finished % 10 === 0 || finished === tracks.length) {
        logger.info(`[ReencodeAudio] ${finished}/${tracks.length} done`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, tracks.length) }, worker));

  logger.info(
    `[ReencodeAudio] finished: ${tracks.length - failed.length} re-encoded, ${failed.length} failed`
  );
  failed.forEach((title) =>
    logger.warn(`[ReencodeAudio] failed: "${title}" (still plays its old copy)`)
  );
}

run()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error(`[ReencodeAudio] ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
