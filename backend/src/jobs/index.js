/**
 * Registers every background job with the queue and starts the repeating
 * schedules. Called by worker.js (BullMQ) or by server.js (in-process queue in dev).
 */
import { queue } from "../services/queue/index.js";
import { processTrackJob } from "../services/trackProcessing.service.js";
import { processBulkImportJob } from "../services/bulkImport.service.js";
import { PUBLISH_SCHEDULED_EVERY_MS, publishScheduledJob } from "./publishScheduled.job.js";
import { syncStorageUsageJob } from "../services/storagePool.service.js";
import { usesStoragePool } from "../services/storage/index.js";
import { computeDailyStats } from "../services/stats/trackStats.service.js";
import { computeSimilarities } from "../services/recommendation/similarity.service.js";
import { moveTrackStorageJob } from "../services/admin/adminStorage.service.js";
import {
  JOBS,
  SIMILARITY_JOB_CRON,
  STATS_JOB_EVERY_MS,
  STATS_TIMEZONE,
  STORAGE_SYNC_EVERY_MS,
} from "../config/constants.js";
import { logger } from "../utils/logger.js";

/**
 * Register processors, start the scheduled-release timer, and start consuming jobs.
 * @returns {Promise<void>}
 */
export async function startJobs() {
  queue.registerProcessors({
    [JOBS.processTrack]: processTrackJob,
    [JOBS.bulkImport]: processBulkImportJob,
    [JOBS.publishScheduled]: () => publishScheduledJob(),
    [JOBS.syncStorageUsage]: () => syncStorageUsageJob(),
    [JOBS.trackDailyStats]: () => computeDailyStats(),
    [JOBS.trackSimilarity]: () => computeSimilarities(),
    [JOBS.moveTrackStorage]: moveTrackStorageJob,
  });
  // Song performance numbers every hour (PRD PRF-1), and once now
  await queue.scheduleRepeating(JOBS.trackDailyStats, STATS_JOB_EVERY_MS);
  await queue.enqueue(
    JOBS.trackDailyStats,
    {},
    { jobId: `${JOBS.trackDailyStats}-startup`, attempts: 1 }
  );
  // "Listeners who liked X also liked Y" every night (PRD 10.4.2 v2)
  await queue.scheduleDaily(JOBS.trackSimilarity, SIMILARITY_JOB_CRON, STATS_TIMEZONE);
  await queue.scheduleRepeating(JOBS.publishScheduled, PUBLISH_SCHEDULED_EVERY_MS);
  // Cloudinary storage pool: real usage every 6 h, and once now (PRD 10.13 step 6)
  if (usesStoragePool) {
    await queue.scheduleRepeating(JOBS.syncStorageUsage, STORAGE_SYNC_EVERY_MS);
    await queue.enqueue(
      JOBS.syncStorageUsage,
      {},
      { jobId: `${JOBS.syncStorageUsage}-startup`, attempts: 1 }
    );
  }
  await queue.startWorker({ concurrency: 2 });
  logger.info(`[Jobs] background jobs running (${queue.name} queue)`);
}
