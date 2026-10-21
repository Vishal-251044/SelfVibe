/**
 * HTTP request logger (pino-http). Logs one line per request with method,
 * URL, status and duration, and tags each request with an id (also returned
 * in the X-Request-Id header) so a single request can be traced in the logs.
 */
import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger } from "../utils/logger.js";

export const requestLogger = pinoHttp({
  logger,
  // Reuse an upstream request id (e.g. from a proxy) or create one
  genReqId: (req, res) => {
    const requestId = req.headers["x-request-id"] || randomUUID();
    res.setHeader("X-Request-Id", requestId);
    return requestId;
  },
  // Server errors → error, client errors → warn, everything else → info
  customLogLevel: (req, res, error) => {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res, responseTime) =>
    `${req.method} ${req.originalUrl} ${res.statusCode} ${Math.round(responseTime)}ms`,
  customErrorMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  // Keep log lines short: only the fields we actually need
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: {
    ignore: (req) => req.url === "/api/health", // health probes would flood the logs
  },
});
