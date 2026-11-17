/**
 * Entry point: connects to MongoDB, starts the HTTP server, and shuts both
 * down cleanly on SIGINT / SIGTERM.
 */
import app from "./src/app.js";
import { assertRequiredEnv, env } from "./src/config/env.js";
import { connectDB, disconnectDB } from "./src/config/db.js";
import { logger } from "./src/utils/logger.js";
import "./src/models/index.js"; // register every model so its indexes are built on connect
import { startJobs } from "./src/jobs/index.js";
import { queue } from "./src/services/queue/index.js";
import { verifyRazorpayKeys } from "./src/services/billing/razorpay.provider.js";
import { captureError, flushErrorTracking, initErrorTracking } from "./src/utils/errorTracking.js";

const SHUTDOWN_TIMEOUT_MS = 10000;

/**
 * Start the API. The server starts even if MongoDB is unreachable so that
 * /api/health can report the problem instead of the process crashing.
 */
async function start() {
  try {
    assertRequiredEnv();
  } catch (error) {
    logger.fatal(error.message);
    process.exit(1);
  }
  initErrorTracking("api");
  if (env.isProduction && !env.email.isConfigured) {
    logger.warn(
      "[Server] RESEND_API_KEY is not set: password resets, staff invites and security alerts can't be emailed"
    );
  }

  await connectDB();

  // Without Redis (development) the API runs background jobs itself;
  // with Redis they run in the separate worker process (npm run worker).
  if (env.queue.driver === "memory") await startJobs();

  const server = app.listen(env.port, () => {
    logger.info(
      `[Server] SelfVibe API listening on http://localhost:${env.port}/api (${env.nodeEnv})`
    );
    verifyRazorpayKeys(); // logs clearly if the payment keys are wrong (never throws)
  });

  server.on("error", (error) => {
    logger.fatal({ err: error }, `[Server] Failed to start on port ${env.port}`);
    process.exit(1);
  });

  /**
   * Stop accepting connections, close the DB, then exit.
   * @param {string} signal - The signal that triggered shutdown
   */
  const shutdown = (signal) => {
    logger.info(`[Server] ${signal} received, shutting down`);

    // Force exit if connections do not drain in time
    setTimeout(() => {
      logger.error("[Server] Shutdown timed out, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async () => {
      await queue.close();
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "[Process] Unhandled promise rejection");
  captureError(reason);
});

process.on("uncaughtException", async (error) => {
  logger.fatal({ err: error }, "[Process] Uncaught exception — exiting");
  captureError(error);
  await flushErrorTracking();
  process.exit(1);
});

start();
