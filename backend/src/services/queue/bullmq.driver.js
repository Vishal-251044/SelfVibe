/**
 * BullMQ job queue on Redis (Upstash in production).
 * The API process only ENQUEUES jobs; `npm run worker` (worker.js) runs them,
 * so heavy work (FFmpeg) never slows down API requests.
 */
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { captureError } from "../../utils/errorTracking.js";

const QUEUE_NAME = "selfvibe-jobs";
const processors = new Map();
let connection = null;
let queue = null;
let worker = null;

/** Shared Redis connection (BullMQ needs maxRetriesPerRequest: null). */
function getConnection() {
  connection ??= new IORedis(env.queue.redisUrl, { maxRetriesPerRequest: null });
  return connection;
}

function getQueue() {
  queue ??= new Queue(QUEUE_NAME, {
    connection: getConnection(),
    defaultJobOptions: {
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });
  return queue;
}

export const bullmqQueue = {
  name: "bullmq",

  registerProcessors(map) {
    Object.entries(map).forEach(([name, fn]) => processors.set(name, fn));
  },

  async enqueue(name, data, { jobId, attempts = 3, delayMs = 0 } = {}) {
    const job = await getQueue().add(name, data, {
      jobId,
      attempts,
      delay: delayMs,
      backoff: { type: "exponential", delay: 2000 },
    });
    return job.id;
  },

  async scheduleRepeating(name, everyMs) {
    await getQueue().upsertJobScheduler(
      `${name}-scheduler`,
      { every: everyMs },
      { name, data: {} }
    );
  },

  /**
   * Run a job on a cron schedule (e.g. nightly batch), in a time zone.
   * @param {string} name
   * @param {string} pattern - Cron, e.g. "0 3 * * *"
   * @param {string} timeZone - e.g. "Asia/Kolkata"
   */
  async scheduleDaily(name, pattern, timeZone) {
    await getQueue().upsertJobScheduler(
      `${name}-scheduler`,
      { pattern, tz: timeZone },
      { name, data: {} }
    );
  },

  /** Start processing jobs (worker process only). */
  async startWorker({ concurrency = 2 } = {}) {
    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const processor = processors.get(job.name);
        if (!processor) throw new Error(`No processor registered for job "${job.name}"`);
        return processor({
          id: job.id,
          name: job.name,
          data: job.data,
          attemptsMade: job.attemptsMade + 1,
        });
      },
      { connection: getConnection(), concurrency }
    );
    worker.on("failed", (job, error) => {
      logger.error(
        `[Queue] job ${job?.name}#${job?.id} failed (attempt ${job?.attemptsMade}): ${error.message}`
      );
      // Only the last attempt is an incident worth reporting
      if (!job || job.attemptsMade >= (job.opts?.attempts ?? 1)) {
        captureError(error, { job: job?.name, extra: { jobId: job?.id } });
      }
    });
  },

  async close() {
    await worker?.close();
    await queue?.close();
    await connection?.quit();
  },
};
