/**
 * System-level API calls (health and status).
 */
import { api } from "@/services/api";

/**
 * Fetch API and database health.
 * @param {Object} [options] - Passed through to the API client (e.g. signal)
 * @returns {Promise<{status: string, db: string, uptimeSec: number, timestamp: string}>}
 */
export function getHealth(options) {
  return api.get("/health", options);
}
