/**
 * In-process job queue — DEVELOPMENT ONLY (used when REDIS_URL is not set).
 * Same behaviour as the BullMQ driver: retries with exponential backoff,
 * delayed jobs, de-duplication by jobId and repeating schedules — but jobs run
 * inside the API process and are lost if it restarts.
 */
import { logger } from "../../utils/logger.js";
import { msUntilDailyRun } from "../../utils/dates.js";

const processors = new Map();
const activeJobIds = new Set();
const timers = new Set();
let running = 0;
const MAX_CONCURRENCY = 2;
const waiting = [];

/**
 * Run the next waiting job if a slot is free.
 */
function drain() {
  while (running < MAX_CONCURRENCY && waiting.length > 0) {
    const job = waiting.shift();
    running += 1;
    runJob(job).finally(() => {
      running -= 1;
      drain();
    });
  }
}

/**
 * Run one job, retrying with backoff on failure.
 * @param {{ name: string, data: Object, id: string, attempts: number, attemptsMade: number }} job
 */
async function runJob(job) {
  const processor = processors.get(job.name);
  if (!processor) {
    logger.error(`[Queue] no processor registered for job "${job.name}"`);
    activeJobIds.delete(job.id);
    return;
  }

  try {
    job.attemptsMade += 1;
    await processor({ id: job.id, name: job.name, data: job.data, attemptsMade: job.attemptsMade });
    activeJobIds.delete(job.id);
  } catch (error) {
    if (job.attemptsMade < job.attempts) {
      const delayMs = 2000 * 2 ** (job.attemptsMade - 1);
      logger.warn(
        `[Queue] job ${job.name}#${job.id} failed (attempt ${job.attemptsMade}/${job.attempts}), retrying in ${delayMs / 1000}s: ${error.message}`
      );
      later(() => waiting.push(job) && drain(), delayMs);
    } else {
      logger.error({ err: error }, `[Queue] job ${job.name}#${job.id} failed permanently`);
      activeJobIds.delete(job.id);
    }
  }
}

/**
 * setTimeout that does not keep the process alive and is cleaned up on close.
 * @param {Function} fn
 * @param {number} ms
 */
function later(fn, ms) {
  const timer = setTimeout(() => {
    timers.delete(timer);
    fn();
  }, ms);
  timer.unref();
  timers.add(timer);
}

export const memoryQueue = {
  name: "memory",

  /** @param {Object<string, Function>} map - job name → async ({ data }) => void */
  registerProcessors(map) {
    Object.entries(map).forEach(([name, fn]) => processors.set(name, fn));
  },

  async enqueue(name, data, { jobId, attempts = 3, delayMs = 0 } = {}) {
    const id = jobId ?? `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (activeJobIds.has(id)) return id; // already queued or running
    activeJobIds.add(id);
    const job = { name, data, id, attempts, attemptsMade: 0 };
    if (delayMs > 0) later(() => waiting.push(job) && drain(), delayMs);
    else setImmediate(() => waiting.push(job) && drain());
    return id;
  },

  async scheduleRepeating(name, everyMs) {
    const timer = setInterval(
      () => memoryQueue.enqueue(name, {}, { jobId: `${name}-repeat` }),
      everyMs
    );
    timer.unref();
    timers.add(timer);
  },

  /**
   * Run a job every day at a fixed time ("M H * * *" cron only, in the given zone).
   * @param {string} name
   * @param {string} pattern - e.g. "0 3 * * *"
   * @param {string} timeZone
   */
  async scheduleDaily(name, pattern, timeZone) {
    const run = () => memoryQueue.enqueue(name, {}, { jobId: `${name}-daily` });
    const arm = () => {
      const timer = setTimeout(
        () => {
          run();
          arm();
        },
        msUntilDailyRun(pattern, timeZone)
      );
      timer.unref();
      timers.add(timer);
    };
    arm();
  },

  async startWorker() {
    // Jobs already run in this process as they are enqueued
  },

  async close() {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  },
};
