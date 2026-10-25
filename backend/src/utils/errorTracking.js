/**
 * Error tracking with Sentry (PRD §14 Observability, roadmap Day 10).
 * Off until SENTRY_DSN is set — then unexpected errors (5xx responses, failed
 * jobs, crashes) are sent to Sentry with the request id, so a user's report,
 * the server log line and the Sentry issue can be matched. Expected errors
 * (4xx) are never sent. Request bodies, cookies and auth headers are dropped
 * before anything leaves the server.
 */
import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

let isEnabled = false;

/**
 * Remove anything sensitive from an event before it is sent.
 * @param {import("@sentry/node").ErrorEvent} event
 * @returns {import("@sentry/node").ErrorEvent}
 */
function scrubEvent(event) {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.authorization;
    }
  }
  return event;
}

/**
 * Start Sentry once per process.
 * @param {"api"|"worker"} service - Tagged on every event
 */
export function initErrorTracking(service) {
  if (isEnabled || !env.sentry.dsn) return;
  Sentry.init({
    dsn: env.sentry.dsn,
    environment: env.nodeEnv,
    release: env.sentry.release,
    tracesSampleRate: env.sentry.tracesSampleRate,
    sendDefaultPii: false,
    initialScope: { tags: { service } },
    beforeSend: scrubEvent,
  });
  isEnabled = true;
  logger.info(`[ErrorTracking] Sentry enabled for ${service} (${env.nodeEnv})`);
}

/**
 * Report an unexpected error. Safe to call when Sentry is off (does nothing).
 * @param {unknown} error
 * @param {{ reqId?: string, userId?: string|null, route?: string, job?: string, extra?: Object }} [context]
 */
export function captureError(error, { reqId, userId, route, job, extra } = {}) {
  if (!isEnabled) return;
  Sentry.withScope((scope) => {
    if (reqId) scope.setTag("request_id", reqId);
    if (route) scope.setTag("route", route);
    if (job) scope.setTag("job", job);
    if (userId) scope.setUser({ id: String(userId) }); // id only, never email
    if (extra) scope.setExtras(extra);
    Sentry.captureException(error);
  });
}

/**
 * Send queued events before the process exits.
 * @param {number} [timeoutMs=2000]
 * @returns {Promise<void>}
 */
export async function flushErrorTracking(timeoutMs = 2000) {
  if (isEnabled) await Sentry.flush(timeoutMs);
}
