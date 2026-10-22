/**
 * Refresh-token sessions for users and staff.
 * - Every refresh rotates the token (old one stops working).
 * - Reusing an old token after the grace window is treated as theft: the whole
 *   session is revoked.
 * - User sessions slide (30 days from last refresh); staff sessions are absolute
 *   (8 hours from login) and also end after 30 minutes without activity.
 */
import { Session } from "../models/session.model.js";
import { env } from "../config/env.js";
import {
  ERROR_CODES,
  REFRESH_REUSE_GRACE_MS,
  SESSION_KINDS,
  STAFF_ACTIVITY_WRITE_INTERVAL_MS,
} from "../config/constants.js";
import { generateRefreshToken } from "./token.service.js";
import { ApiError } from "../utils/ApiError.js";
import { hashToken } from "../utils/crypto.js";
import { logger } from "../utils/logger.js";

const MINUTE_MS = 60 * 1000;
const RECENT_TOKEN_HISTORY = 10; // replaced token hashes kept per session

/**
 * Lifetime of a session of the given kind.
 * @param {"user"|"staff"} kind
 * @returns {number} milliseconds
 */
function sessionTtlMs(kind) {
  return kind === SESSION_KINDS.STAFF
    ? env.auth.staffRefreshTokenTtlHours * 60 * MINUTE_MS
    : env.auth.refreshTokenTtlDays * 24 * 60 * MINUTE_MS;
}

/** @returns {ApiError} 401 asking the client to log in again */
function invalidRefreshError(message = "Your session has ended. Please log in again.") {
  return ApiError.unauthorized(message, { code: ERROR_CODES.REFRESH_INVALID });
}

/**
 * Whether a staff session has been idle longer than the allowed timeout.
 * @param {{ kind: string, lastActivityAt: Date }} session
 * @returns {boolean}
 */
export function isSessionIdle(session) {
  if (session.kind !== SESSION_KINDS.STAFF) return false;
  const idleMs = Date.now() - new Date(session.lastActivityAt).getTime();
  return idleMs > env.auth.staffIdleTimeoutMinutes * MINUTE_MS;
}

/**
 * Start a new session (after a successful login).
 * @param {string} userId
 * @param {"user"|"staff"} kind
 * @param {{ userAgent?: string, ip?: string }} [meta] - Device info for the session list
 * @returns {Promise<{ session: Object, refreshToken: string }>}
 */
export async function createSession(userId, kind, meta = {}) {
  const { token, tokenHash } = generateRefreshToken();
  const session = await Session.create({
    userId,
    kind,
    tokenHash,
    expiresAt: new Date(Date.now() + sessionTtlMs(kind)),
    lastActivityAt: new Date(),
    userAgent: meta.userAgent?.slice(0, 400) ?? null,
    ip: meta.ip ?? null,
  });
  return { session, refreshToken: token };
}

/**
 * Atomically replace a session's current refresh token with a new one and
 * remember the replaced hash (for the grace window and theft detection).
 * @param {Object} filter - Extra match conditions (which token / session)
 * @param {string} supersededHash - Hash being replaced
 * @param {"user"|"staff"} kind
 * @param {Date} now
 * @returns {Promise<{ session: Object, refreshToken: string } | null>} null when nothing matched
 */
async function swapToken(filter, supersededHash, kind, now) {
  const { token, tokenHash } = generateRefreshToken();

  // Staff sessions keep their absolute expiry; user sessions slide forward
  const extendExpiry =
    kind === SESSION_KINDS.USER ? { expiresAt: new Date(now.getTime() + sessionTtlMs(kind)) } : {};

  const session = await Session.findOneAndUpdate(
    { ...filter, kind, revokedAt: null, expiresAt: { $gt: now } },
    {
      $set: { tokenHash, ...extendExpiry },
      $push: {
        recentTokens: {
          $each: [{ hash: supersededHash, supersededAt: now }],
          $slice: -RECENT_TOKEN_HISTORY,
        },
      },
    },
    { returnDocument: "after" }
  );
  return session ? { session, refreshToken: token } : null;
}

/**
 * Exchange a refresh token for a new one (rotation).
 * - Current token → rotated.
 * - Token replaced less than a minute ago (response lost, page reloaded while
 *   refreshing, two tabs) → accepted once more and rotated again.
 * - Token replaced longer ago → treated as stolen; the whole session is revoked.
 * @param {string|undefined} refreshToken - Plain token from the cookie
 * @param {"user"|"staff"} kind
 * @returns {Promise<{ session: Object, refreshToken: string }>}
 * @throws {ApiError} 401 REFRESH_INVALID / SESSION_IDLE
 */
export async function rotateSession(refreshToken, kind) {
  if (!refreshToken) throw invalidRefreshError("You are not logged in");

  const presentedHash = hashToken(refreshToken);
  const now = new Date();

  const result =
    (await swapToken({ tokenHash: presentedHash }, presentedHash, kind, now)) ??
    (await rotateFromRecentToken(presentedHash, kind, now));

  if (isSessionIdle(result.session)) {
    await revokeSession(result.session._id, "idle_timeout");
    throw ApiError.unauthorized("You were signed out after 30 minutes of inactivity", {
      code: ERROR_CODES.SESSION_IDLE,
    });
  }
  return result;
}

/**
 * Handle a token that is not the current one: allow it within the grace
 * window, otherwise revoke the session (reuse of an old token = theft).
 * @param {string} presentedHash
 * @param {"user"|"staff"} kind
 * @param {Date} now
 * @returns {Promise<{ session: Object, refreshToken: string }>}
 * @throws {ApiError} 401 when the token is unknown, too old, or the session ended
 */
async function rotateFromRecentToken(presentedHash, kind, now) {
  // Retry a few times: concurrent refreshes may rotate the session under us
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const session = await Session.findOne({ kind, "recentTokens.hash": presentedHash });
    if (!session || session.revokedAt || session.expiresAt <= now) throw invalidRefreshError();

    const entry = session.recentTokens.find((recent) => recent.hash === presentedHash);
    const supersededForMs = now.getTime() - new Date(entry.supersededAt).getTime();

    if (supersededForMs > REFRESH_REUSE_GRACE_MS) {
      logger.warn(
        `[SessionService] refresh token reuse detected userId=${session.userId} sessionId=${session._id} kind=${kind} — revoking session`
      );
      await revokeSession(session._id, "token_reuse");
      throw invalidRefreshError("For your security, please log in again");
    }

    const result = await swapToken(
      { _id: session._id, tokenHash: session.tokenHash },
      session.tokenHash,
      kind,
      now
    );
    if (result) return result;
  }
  throw invalidRefreshError();
}

/**
 * Revoke one session.
 * @param {string} sessionId
 * @param {string} reason - e.g. "logout", "idle_timeout", "token_reuse"
 * @returns {Promise<void>}
 */
export async function revokeSession(sessionId, reason) {
  await Session.updateOne(
    { _id: sessionId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } }
  );
}

/**
 * Revoke the session that owns a refresh token (used by logout).
 * Unknown tokens are ignored so logout always succeeds.
 * @param {string|undefined} refreshToken
 * @param {"user"|"staff"} kind
 * @returns {Promise<void>}
 */
export async function revokeSessionByToken(refreshToken, kind) {
  if (!refreshToken) return;
  await Session.updateOne(
    { tokenHash: hashToken(refreshToken), kind, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: "logout" } }
  );
}

/**
 * Load an active staff session for a request and record activity.
 * Activity is written at most once a minute to keep requests cheap.
 * @param {string} sessionId - From the access token's `sid` claim
 * @returns {Promise<Object>} The session
 * @throws {ApiError} 401 when revoked, expired or idle
 */
export async function getActiveStaffSession(sessionId) {
  const session = await Session.findOne({
    _id: sessionId,
    kind: SESSION_KINDS.STAFF,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!session) throw invalidRefreshError("Your console session has ended. Please log in again.");

  if (isSessionIdle(session)) {
    await revokeSession(session._id, "idle_timeout");
    throw ApiError.unauthorized("You were signed out after 30 minutes of inactivity", {
      code: ERROR_CODES.SESSION_IDLE,
    });
  }

  const sinceLastWriteMs = Date.now() - new Date(session.lastActivityAt).getTime();
  if (sinceLastWriteMs > STAFF_ACTIVITY_WRITE_INTERVAL_MS) {
    await Session.updateOne({ _id: session._id }, { $set: { lastActivityAt: new Date() } });
  }

  return session;
}
