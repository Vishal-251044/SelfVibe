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

/** "import" = royalty-free library tracks added by the catalog import script. */
export const TRACK_SOURCE = Object.freeze(["upload", "ai", "import"]);

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
  // Short-lived Google sign-in state (CSRF state + PKCE verifier + return path)
  OAUTH_STATE: { name: "sv_oauth", path: "/api/auth/google" },
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
  RESET_TOKEN_INVALID: "RESET_TOKEN_INVALID",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  UNKNOWN_TASTE_OPTION: "UNKNOWN_TASTE_OPTION",
  GOOGLE_EMAIL_UNVERIFIED: "GOOGLE_EMAIL_UNVERIFIED",
  GOOGLE_ACCOUNT_CONFLICT: "GOOGLE_ACCOUNT_CONFLICT",
  INVALID_UPLOAD: "INVALID_UPLOAD",
  NOT_FOUND: "NOT_FOUND",
  TRACK_NOT_READY: "TRACK_NOT_READY",
  DUPLICATE_REPORT: "DUPLICATE_REPORT",
  INVALID_STATE: "INVALID_STATE",
  STORAGE_FULL: "STORAGE_FULL",
  UPLOAD_LIMIT_REACHED: "UPLOAD_LIMIT_REACHED",
  RATE_LIMITED: "RATE_LIMITED",
});

/* ===== Onboarding & taste profile ===== */

/** Taste quiz rules (PRD ONB-1): pick at least 3 genres and 2 vibes; artists optional. */
export const ONBOARDING_LIMITS = Object.freeze({
  minGenres: 3,
  maxGenres: 10,
  minVibes: 2,
  maxVibes: 8,
  maxArtists: 20,
});

/**
 * Starting weights from the quiz (PRD §10.4.1 "Onboarding quiz: cold-start prior").
 * Same scale as listening signals: like +5, follow artist +4.
 */
export const QUIZ_TASTE_WEIGHTS = Object.freeze({ genre: 5, vibe: 5, artist: 4 });

/* ===== Uploads ===== */

export const AVATAR_UPLOAD = Object.freeze({
  folder: "selfvibe/avatars",
  allowedFormats: ["jpg", "jpeg", "png", "webp"],
  maxBytes: 5 * 1024 * 1024, // checked in the browser; Cloudinary rejects > 10 MB on free plans
});

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

/* ===== Music: uploads, processing, streaming (Day 4) ===== */

/** Audio uploads (PRD CRT-2): MP3, WAV, FLAC, M4A up to 50 MB. */
export const AUDIO_UPLOAD = Object.freeze({
  maxBytes: 50 * 1024 * 1024,
  mimeTypes: Object.freeze({
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
  }),
  maxDurationSec: 20 * 60, // longer files are rejected during processing
});

/** Cover images for tracks, albums and artists. */
export const IMAGE_UPLOAD = Object.freeze({
  maxBytes: 10 * 1024 * 1024,
  mimeTypes: Object.freeze({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }),
});

/** Playback copy (PRD CRT-4, STO-6): one 192 kbps MP3; the original upload is kept. */
export const AUDIO_RENDITIONS = Object.freeze({
  standard: { bitrateKbps: 192, codec: "mp3" },
});
export const WAVEFORM_PEAK_COUNT = 160;

/** Where the API is allowed to put things in object storage. */
export const STORAGE_PREFIXES = Object.freeze({
  incoming: "incoming", // browser uploads land here first (private)
  audio: "audio", // processed audio (private, streamed with signed URLs)
  covers: "covers", // processed images (public)
});

/** What a new track should become once processing finishes. */
export const RELEASE_INTENTS = Object.freeze(["publish", "schedule", "draft"]);
export const PROCESSING_STATES = Object.freeze(["queued", "running", "done", "failed"]);

export const MOODS = Object.freeze([
  "calm",
  "chill",
  "dark",
  "dreamy",
  "energetic",
  "happy",
  "melancholic",
  "romantic",
  "uplifting",
]);
export const LANGUAGES = Object.freeze([
  "hindi",
  "english",
  "punjabi",
  "marathi",
  "tamil",
  "telugu",
  "bengali",
  "instrumental",
  "other",
]);

/** Report reasons (PRD F32 / §7 copyright risk). */
export const REPORT_REASONS = Object.freeze(["copyright", "abuse", "explicit", "spam", "other"]);
export const REPORT_TARGET_TYPES = Object.freeze(["track", "artist"]);

export const ALBUM_TYPES = Object.freeze(["album", "ep", "single"]);

/** Admin bulk upload (PRD MUS-2): up to 50 files + optional CSV. */
export const BULK_UPLOAD_MAX_FILES = 50;

/** Background job names. */
export const JOBS = Object.freeze({
  processTrack: "process-track",
  bulkImport: "bulk-import",
  publishScheduled: "publish-scheduled",
  syncStorageUsage: "sync-storage-usage",
});

/** Official = added by the Owner / staff; Community = uploaded by users (PRD 10.14, F51). */
export const CATALOGS = Object.freeze(["official", "community"]);

/**
 * Cloudinary storage pools (PRD 10.13). "shared" accounts serve both pools
 * (e.g. a single paid account).
 */
export const STORAGE_POOLS = Object.freeze(["official", "community", "shared"]);
export const STORAGE_ACCOUNT_STATUS = Object.freeze(["active", "full", "paused"]);
/** Accounts above this share of their quota get no new uploads (PRD 10.13 step 6). */
export const STORAGE_FULL_PERCENT = 85;
/** Default song space per account when CLOUDINARY_ACCOUNTS gives no quota (PRD 10.13.2). */
export const STORAGE_DEFAULT_QUOTA_GB = 10;
export const STORAGE_SYNC_EVERY_MS = 6 * 60 * 60 * 1000;

/**
 * Community upload limits per plan (PRD CRT-8): songs per user; null = unlimited.
 * Moves to admin Settings when that page is built.
 */
export const UPLOAD_LIMITS = Object.freeze({ free: 20, premium: 20, creatorPro: null });
