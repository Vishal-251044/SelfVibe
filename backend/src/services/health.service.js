/**
 * Health checks for the API and its dependencies.
 */
import { getDbStatus } from "../config/db.js";
import { env } from "../config/env.js";

/**
 * Build a snapshot of service health.
 * @returns {{ status: "ok"|"degraded", db: string, uptimeSec: number, environment: string, timestamp: string }}
 */
export function getHealthStatus() {
  const db = getDbStatus();

  return {
    status: db === "connected" ? "ok" : "degraded",
    db,
    uptimeSec: Math.round(process.uptime()),
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  };
}
