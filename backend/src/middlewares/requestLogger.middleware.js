/**
 * HTTP request logger: exactly one line per API call, e.g.
 *   POST /api/auth/register 201 823ms
 * Server errors log as "error", client errors as "warn", the rest as "info".
 * Each request also gets an id (returned in the X-Request-Id header) so a
 * user's error report can be matched to the server logs.
 */
import { randomUUID } from "node:crypto";
import { logger } from "../utils/logger.js";

// Health probes run every few seconds and would flood the log
const SKIPPED_PATHS = new Set(["/api/health"]);

/**
 * @type {import("express").RequestHandler}
 */
export function requestLogger(req, res, next) {
  // Reuse an upstream request id (e.g. from a proxy) or create one
  req.id = req.headers["x-request-id"] || randomUUID();
  res.setHeader("X-Request-Id", req.id);

  if (SKIPPED_PATHS.has(req.path)) return next();

  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6);
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });

  return next();
}
