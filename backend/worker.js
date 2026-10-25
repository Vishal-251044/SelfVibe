/**
 * Background worker entry point (`npm run worker`): processes uploads
 * (FFmpeg), bulk imports and scheduled releases from the Redis queue.
 * Only needed when REDIS_URL is set — without Redis (development), the API
 * process runs jobs itself.
 */
import { assertRequiredEnv, env } from "./src/config/env.js";
import { connectDB, disconnectDB } from "./src/config/db.js";
import { startJobs } from "./src/jobs/index.js";
import { queue } from "./src/services/queue/index.js";
import { logger } from "./src/utils/logger.js";
import "./src/models/index.js";
import { captureError, flushErrorTracking, initErrorTracking } from "./src/utils/errorTracking.js";

async function start() {
  try {
    assertRequiredEnv();
  } catch (error) {
    logger.fatal(error.message);
    process.exit(1);
  }
  if (env.queue.driver !== "bullmq") {
    logger.fatal(
      "[Worker] REDIS_URL is not set — without Redis the API runs jobs itself, so the worker is not needed."
    );
    process.exit(1);
  }

  initErrorTracking("worker");

  await connectDB();
  await startJobs();

  const shutdown = async (signal) => {
    logger.info(`[Worker] ${signal} received, finishing current jobs`);
    await queue.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "[Worker] Unhandled promise rejection");
  captureError(reason);
});

process.on("uncaughtException", async (error) => {
  logger.fatal({ err: error }, "[Worker] Uncaught exception — exiting");
  captureError(error);
  await flushErrorTracking();
  process.exit(1);
});

start();
