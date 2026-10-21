/**
 * Health endpoint controller.
 */
import { getHealthStatus } from "../services/health.service.js";
import { sendError, sendSuccess } from "../utils/ApiResponse.js";

/**
 * GET /api/health — API and database status.
 * Returns 200 when everything is up, 503 when the database is not connected
 * (so load balancers and uptime monitors can detect it).
 * @type {import("express").RequestHandler}
 */
export function getHealth(req, res) {
  const health = getHealthStatus();

  if (health.status !== "ok") {
    return sendError(res, {
      statusCode: 503,
      message: `Service degraded: database ${health.db}`,
      error: health,
    });
  }

  return sendSuccess(res, { message: "Service healthy", data: health });
}
