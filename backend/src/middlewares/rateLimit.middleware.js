/**
 * Rate limiters for sensitive routes (PRD AUTH-5, ADL-5).
 * In-memory store for now (single API instance). Switch to the Redis store
 * when Redis is added on Day 4 so limits hold across instances.
 */
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { COMMENT_RATE_LIMIT, ERROR_CODES, LOGIN_RATE_LIMIT } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

/**
 * Build a limiter that answers with the standard error envelope.
 * @param {Object} options
 * @param {string} options.name - Used in logs
 * @param {number} options.windowMs
 * @param {number} options.limit - Max counted requests per window
 * @param {string} options.message - Shown to the user
 * @param {Function} [options.keyGenerator] - (req) => key; defaults to the client IP
 * @param {boolean} [options.skipSuccessfulRequests=false] - Only count failures
 * @returns {import("express").RequestHandler}
 */
function createLimiter({
  name,
  windowMs,
  limit,
  message,
  keyGenerator,
  skipSuccessfulRequests = false,
}) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: keyGenerator ?? ((req) => ipKeyGenerator(req.ip)),
    handler: (req, res, next, options) => {
      const retryAfterSec = Math.ceil(options.windowMs / 1000);
      logger.warn(`[RateLimit] ${name} limit hit ip=${req.ip} ${req.method} ${req.originalUrl}`);
      next(new ApiError(429, message, { code: ERROR_CODES.RATE_LIMITED, retryAfterSec }));
    },
  });
}

/**
 * Key login attempts by IP + email, so one person cannot lock out everyone on
 * a shared network, and one email cannot be guessed from many IPs quickly.
 * @param {import("express").Request} req
 * @returns {string}
 */
function ipAndEmailKey(req) {
  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase();
  return `${ipKeyGenerator(req.ip)}|${email}`;
}

/** 5 failed logins per 15 minutes per IP + email (successful logins are not counted). */
export const loginLimiter = createLimiter({
  name: "login",
  ...LOGIN_RATE_LIMIT,
  keyGenerator: ipAndEmailKey,
  skipSuccessfulRequests: true,
  message: "Too many failed login attempts. Please wait 15 minutes and try again.",
});

/** Same limit for the staff console password step. */
export const staffLoginLimiter = createLimiter({
  name: "staff-login",
  ...LOGIN_RATE_LIMIT,
  keyGenerator: ipAndEmailKey,
  skipSuccessfulRequests: true,
  message: "Too many failed sign-in attempts. Please wait 15 minutes and try again.",
});

/** 5 wrong 2FA codes per 15 minutes per IP (stops code guessing). */
export const twoFactorLimiter = createLimiter({
  name: "2fa",
  ...LOGIN_RATE_LIMIT,
  skipSuccessfulRequests: true,
  message: "Too many incorrect codes. Please wait 15 minutes and try again.",
});

/** 10 sign-ups per hour per IP (stops bulk account creation). */
export const registerLimiter = createLimiter({
  name: "register",
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many accounts created from this network. Please try again later.",
});

/** General ceiling for token refresh calls: 60 per 15 minutes per IP. */
export const refreshLimiter = createLimiter({
  name: "refresh",
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: "Too many requests. Please slow down.",
});

/** 5 reset-link requests per hour per IP + email (stops inbox flooding). */
export const forgotPasswordLimiter = createLimiter({
  name: "forgot-password",
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: ipAndEmailKey,
  message: "Too many reset requests. Please check your inbox or try again in an hour.",
});

/** 10 reset attempts per 15 minutes per IP (stops token guessing). */
export const resetPasswordLimiter = createLimiter({
  name: "reset-password",
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many attempts. Please wait 15 minutes and try again.",
});

/** 20 upload signatures per 15 minutes per IP. */
export const uploadSignLimiter = createLimiter({
  name: "upload-sign",
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many uploads. Please wait a few minutes and try again.",
});

/** 20 reports per hour per IP (stops report spam). */
export const reportLimiter = createLimiter({
  name: "report",
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: "Too many reports. Please try again later.",
});

/** Listening events arrive in batches every ~15 s; 120 batches / 10 min per IP is plenty. */
export const listenEventsLimiter = createLimiter({
  name: "listen-events",
  windowMs: 10 * 60 * 1000,
  limit: 120,
  message: "Too many requests. Please slow down.",
});

/** Comments (PRD CMT-3): 10 per 10 minutes per signed-in user. */
export const commentLimiter = createLimiter({
  name: "comment",
  windowMs: COMMENT_RATE_LIMIT.windowMs,
  limit: COMMENT_RATE_LIMIT.max,
  message: "You're commenting too fast. Please wait a few minutes.",
  keyGenerator: (req) => `user:${req.auth?.userId ?? ipKeyGenerator(req.ip)}`,
});

/** Likes, follows and playlist edits: generous, just stops runaway scripts. */
export const libraryWriteLimiter = createLimiter({
  name: "library-write",
  windowMs: 60 * 1000,
  limit: 120,
  message: "Too many changes at once. Please slow down.",
  keyGenerator: (req) => `user:${req.auth?.userId ?? ipKeyGenerator(req.ip)}`,
});
