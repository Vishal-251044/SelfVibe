/**
 * Shared enums and limits used by models, services and validators.
 * Values follow PRD §8.2 (roles) and §13 (data model).
 */

export const USER_ROLES = Object.freeze(["listener", "creator"]);

/** Staff roles for the Owner / Admin Console, highest privilege first. */
export const STAFF_ROLES = Object.freeze(["owner", "admin", "contentManager", "moderator"]);

export const USER_STATUS = Object.freeze(["active", "suspended"]);

export const PLANS = Object.freeze(["free", "premium", "creatorPro"]);

export const TRACK_STATUS = Object.freeze([
  "processing",
  "scheduled",
  "published",
  "unpublished",
  "rejected",
  "taken_down",
]);

export const TRACK_SOURCE = Object.freeze(["upload", "ai"]);

export const TRACK_ADDED_VIA = Object.freeze(["creator", "admin", "ai"]);

export const PLAYLIST_TYPES = Object.freeze(["user", "system"]);

export const LISTEN_EVENT_TYPES = Object.freeze(["play", "skip", "complete", "repeat"]);

/** Listen events are kept for 180 days (PRD §13, listenEvents). */
export const LISTEN_EVENT_TTL_SECONDS = 180 * 24 * 60 * 60;

/* ===== Authentication ===== */

/** Session kinds: listener/creator sessions and staff console sessions are separate (ADL-4). */
export const SESSION_KINDS = Object.freeze({ USER: "user", STAFF: "staff" });

/** JWT audiences keep user, staff and 2FA-challenge tokens from being used for each other. */
export const TOKEN_AUDIENCE = Object.freeze({
  USER: "selfvibe:user",
  STAFF: "selfvibe:staff",
  STAFF_CHALLENGE: "selfvibe:staff-2fa",
});
export const TOKEN_ISSUER = "selfvibe-api";

/** Cookie names and paths. Refresh cookies are httpOnly and scoped to their auth routes. */
export const COOKIES = Object.freeze({
  USER_REFRESH: { name: "sv_rt", path: "/api/auth" },
  STAFF_REFRESH: { name: "sv_srt", path: "/api/admin/auth" },
  // Non-secret "a session exists" hints, readable by the frontend route guard
  USER_HINT: { name: "sv_session", path: "/" },
  STAFF_HINT: { name: "sv_staff", path: "/" },
});

export const BCRYPT_ROUNDS = 12;
/** bcrypt only uses the first 72 bytes of a password; longer input is rejected. */
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_MIN_LENGTH = 8; // PRD AUTH-1
export const OWNER_PASSWORD_MIN_LENGTH = 12;

/**
 * A refresh token replaced less than this long ago is still accepted once (lost
 * response, page reloaded mid-refresh, two tabs). Reuse after this = theft.
 */
export const REFRESH_REUSE_GRACE_MS = 60 * 1000;
/** Staff session activity is written at most once per minute. */
export const STAFF_ACTIVITY_WRITE_INTERVAL_MS = 60 * 1000;

export const TWO_FACTOR_CHALLENGE_TTL = "5m";
export const BACKUP_CODE_COUNT = 10;

/** Login rate limit (PRD AUTH-5 / ADL-5): 5 failed attempts per 15 minutes. */
export const LOGIN_RATE_LIMIT = Object.freeze({ windowMs: 15 * 60 * 1000, limit: 5 });

/** Machine-readable error codes sent as `error.code` so the frontend can react. */
export const ERROR_CODES = Object.freeze({
  VALIDATION_FAILED: "VALIDATION_FAILED",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  REFRESH_INVALID: "REFRESH_INVALID",
  SESSION_IDLE: "SESSION_IDLE",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  FORBIDDEN: "FORBIDDEN",
  NOT_STAFF: "NOT_STAFF",
  TWO_FACTOR_INVALID: "TWO_FACTOR_INVALID",
  TWO_FACTOR_STATE: "TWO_FACTOR_STATE",
  RATE_LIMITED: "RATE_LIMITED",
});
