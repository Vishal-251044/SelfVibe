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

/** What the client reports for one listen (PRD PLY-7): it started, or it stopped. */
export const LISTEN_EVENT_KINDS = Object.freeze(["start", "end"]);
/** Under 30 s listened = skip; at least 80% = complete (PRD 10.4.1, roadmap Day 5). */
export const LISTEN_SKIP_MAX_MS = 30 * 1000;
export const LISTEN_COMPLETE_PERCENT = 80;
export const LISTEN_EVENTS_MAX_BATCH = 50;
export const LISTEN_HISTORY_LIMIT = 100;
export const LISTEN_SOURCES = Object.freeze([
  "artist",
  "album",
  "playlist",
  "search",
  "feed",
  "history",
  "queue",
  "studio",
  "browse",
  "voice",
  "other",
]);
export const LISTEN_DEVICES = Object.freeze(["mobile", "tablet", "desktop"]);
/** Batch stream URLs for the upcoming queue (background play, BGP-5). */
export const STREAM_BATCH_MAX = 20;

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
  ALREADY_EXISTS: "ALREADY_EXISTS",
  IN_USE: "IN_USE",
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
export const REPORT_TARGET_TYPES = Object.freeze(["track", "artist", "comment"]);

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

/* ===== Library & comments (Day 6) ===== */

/** Taste-profile changes from library actions (PRD 10.4.1 signal weights). */
export const TASTE_SIGNALS = Object.freeze({
  like: 5,
  unlike: -5,
  playlistAdd: 4,
  follow: 4,
  unfollow: -4,
});

export const PLAYLIST_MAX_TRACKS = 1000;
export const PLAYLISTS_PER_USER_MAX = 200;
export const PLAYLIST_NAME_MAX = 100;
export const PLAYLIST_DESCRIPTION_MAX = 500;
/** Liked-song / followed-artist id lists returned in one go (heart / follow state in the UI). */
export const LIBRARY_IDS_MAX = 5000;

/** Comments (PRD 10.15.1, CMT-1–3). */
export const COMMENT_MAX_LENGTH = 1000;
export const COMMENT_STATUS = Object.freeze(["visible", "hidden", "removed"]);
export const COMMENT_SORTS = Object.freeze(["newest", "top"]);
/** Rate limit (CMT-3): 10 comments per 10 minutes per user. */
export const COMMENT_RATE_LIMIT = Object.freeze({ max: 10, windowMs: 10 * 60 * 1000 });
/** More links than this in one comment is treated as spam. */
export const COMMENT_MAX_LINKS = 2;

/* ===== Search, browse & voice (Day 7) ===== */

/** The All · Official · Community switch (PRD CAT-2). */
export const CATALOG_FILTERS = Object.freeze(["all", "official", "community"]);
/** Icons the Admin Console can pick for genres / vibes (same list as the web app's registry). */
export const TAXONOMY_ICONS = Object.freeze([
  "Clapperboard",
  "CodeXml",
  "Coffee",
  "Drum",
  "Dumbbell",
  "Flame",
  "Guitar",
  "Headphones",
  "Heart",
  "MicVocal",
  "Moon",
  "Music2",
  "PartyPopper",
  "Piano",
  "Plane",
  "Radio",
  "Smile",
  "Sparkles",
  "Sun",
  "Target",
  "Waves",
  "Zap",
]);
export const SEARCH_QUERY_MAX = 100;
export const SEARCH_RESULTS = Object.freeze({ tracks: 20, artists: 8, playlists: 8, genres: 8 });
export const RECENT_SEARCHES_MAX = 10;
/** Trending = most plays in the last 7 days (roadmap Day 7), cached 10 minutes. */
export const TRENDING_WINDOW_DAYS = 7;
export const TRENDING_CACHE_SECONDS = 10 * 60;
export const BROWSE_PAGE_SIZE = 30;
/** Voice command log keeps text only, for 30 days (PRD VOC-7). */
export const VOICE_LOG_TTL_SECONDS = 30 * 24 * 60 * 60;
export const VOICE_LANGUAGES = Object.freeze(["en-IN", "hi-IN"]);
/** "Play <name>": below this score the app shows the top 3 to choose from (PRD VOC-4). */
export const VOICE_CONFIDENT_SCORE = 0.82;
/** What a voice command was understood as (frontend parser → POST /voice/log). */
export const VOICE_INTENTS = Object.freeze([
  "next",
  "previous",
  "pause",
  "resume",
  "volumeUp",
  "volumeDown",
  "volumeSet",
  "mute",
  "unmute",
  "like",
  "unlike",
  "shuffleOn",
  "shuffleOff",
  "repeatOne",
  "repeatOff",
  "whatsPlaying",
  "play",
  "addToPlaylist",
  "unknown",
]);
/** How a voice command ended. */
export const VOICE_OUTCOMES = Object.freeze(["done", "picker", "not_found", "failed"]);
export const VOICE_TRANSCRIPT_MAX = 200;
