/**
 * MongoDB (Atlas) connection via Mongoose: connect, disconnect and status.
 */
import mongoose from "mongoose";
import { env, isUnset } from "./env.js";
import { logger } from "../utils/logger.js";

// Mongoose readyState → readable status (used by /api/health)
const READY_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

mongoose.set("strictQuery", true);

// Log connection lifecycle changes after the first connect
mongoose.connection.on("disconnected", () => logger.warn("[DB] MongoDB disconnected"));
mongoose.connection.on("reconnected", () => logger.info("[DB] MongoDB reconnected"));
mongoose.connection.on("error", (error) =>
  logger.error({ err: error }, "[DB] MongoDB connection error")
);

// Retry the initial connection with backoff: 5s, 10s, 20s … capped at 60s
const RETRY_BASE_DELAY_MS = 5000;
const RETRY_MAX_DELAY_MS = 60000;
let retryTimer = null;
let isShuttingDown = false;

/**
 * Attempt one connection; on failure, schedule the next attempt.
 * Mongoose only auto-reconnects after a successful first connect, so the
 * initial connect needs its own retry loop (e.g. when Atlas blocks the IP).
 * @param {number} attempt - 1-based attempt number
 * @returns {Promise<boolean>} true when connected
 */
async function tryConnect(attempt) {
  try {
    await mongoose.connect(env.databaseUrl, { serverSelectionTimeoutMS: 10000 });
    const { host, name } = mongoose.connection;
    logger.info(`[DB] MongoDB connected host=${host} db=${name} (attempt ${attempt})`);
    return true;
  } catch (error) {
    if (isShuttingDown) return false;

    const delayMs = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
    logger.error(
      `[DB] Could not connect to MongoDB (attempt ${attempt}): ${error.message} — check DATABASE_URL and Atlas Network Access. Retrying in ${delayMs / 1000}s`
    );
    retryTimer = setTimeout(() => tryConnect(attempt + 1), delayMs);
    retryTimer.unref(); // never keep the process alive just to retry
    return false;
  }
}

/**
 * Connect to MongoDB using DATABASE_URL. If the first attempt fails, keeps
 * retrying in the background so the API recovers without a restart.
 * @returns {Promise<boolean>} true when connected on the first attempt
 */
export async function connectDB() {
  if (isUnset(env.databaseUrl)) {
    logger.warn(
      "[DB] DATABASE_URL is not set. Add your MongoDB Atlas connection string to backend/.env — the API will run, but /api/health will report the database as disconnected."
    );
    return false;
  }

  return tryConnect(1);
}

/**
 * Stop retrying and close the MongoDB connection (used during graceful shutdown).
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  isShuttingDown = true;
  clearTimeout(retryTimer);

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info("[DB] MongoDB connection closed");
  }
}

/**
 * Current database connection status.
 * @returns {"connected"|"connecting"|"disconnected"|"disconnecting"}
 */
export function getDbStatus() {
  return READY_STATES[mongoose.connection.readyState] ?? "disconnected";
}
