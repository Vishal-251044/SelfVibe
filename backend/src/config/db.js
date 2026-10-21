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

/**
 * Connect to MongoDB using DATABASE_URL.
 * @returns {Promise<boolean>} true when connected, false when the URL is unset or the connection failed
 */
export async function connectDB() {
  if (isUnset(env.databaseUrl)) {
    logger.warn(
      "[DB] DATABASE_URL is not set. Add your MongoDB Atlas connection string to backend/.env — the API will run, but /api/health will report the database as disconnected."
    );
    return false;
  }

  try {
    await mongoose.connect(env.databaseUrl, { serverSelectionTimeoutMS: 10000 });
    const { host, name } = mongoose.connection;
    logger.info(`[DB] MongoDB connected host=${host} db=${name}`);
    return true;
  } catch (error) {
    logger.error(
      { err: error },
      "[DB] Could not connect to MongoDB — check DATABASE_URL and Atlas network access"
    );
    return false;
  }
}

/**
 * Close the MongoDB connection (used during graceful shutdown).
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
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
