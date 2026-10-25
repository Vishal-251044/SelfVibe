/**
 * Music constants shared by the creator studio, the artist page and the
 * Admin Console music manager. Limits mirror the API (backend config/constants.js)
 * so the browser can reject a bad file before uploading it.
 */

/** Audio uploads (PRD CRT-2): MP3 / WAV / FLAC / M4A, up to 50 MB. */
export const AUDIO_UPLOAD = {
  maxBytes: 50 * 1024 * 1024,
  accept:
    ".mp3,.wav,.flac,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/x-flac,audio/mp4,audio/x-m4a",
  mimeTypes: {
    "audio/mpeg": "audio/mpeg",
    "audio/mp3": "audio/mpeg",
    "audio/wav": "audio/wav",
    "audio/x-wav": "audio/wav",
    "audio/wave": "audio/wav",
    "audio/flac": "audio/flac",
    "audio/x-flac": "audio/flac",
    "audio/mp4": "audio/mp4",
    "audio/x-m4a": "audio/mp4",
    "audio/m4a": "audio/mp4",
  },
  // Some browsers leave file.type empty for FLAC — fall back to the extension
  extensions: { mp3: "audio/mpeg", wav: "audio/wav", flac: "audio/flac", m4a: "audio/mp4" },
  label: "MP3, WAV, FLAC or M4A · up to 50 MB",
};

/** Cover and artist images: JPG / PNG / WebP, up to 10 MB. */
export const IMAGE_UPLOAD = {
  maxBytes: 10 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
  mimeTypes: { "image/jpeg": "image/jpeg", "image/png": "image/png", "image/webp": "image/webp" },
  extensions: { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" },
  label: "JPG, PNG or WebP · up to 10 MB",
};

export const BULK_UPLOAD_MAX_FILES = 50;
export const MAX_TRACK_GENRES = 5;
export const MAX_TRACK_VIBES = 5;

export const MOODS = [
  { value: "calm", label: "Calm" },
  { value: "chill", label: "Chill" },
  { value: "dark", label: "Dark" },
  { value: "dreamy", label: "Dreamy" },
  { value: "energetic", label: "Energetic" },
  { value: "happy", label: "Happy" },
  { value: "melancholic", label: "Melancholic" },
  { value: "romantic", label: "Romantic" },
  { value: "uplifting", label: "Uplifting" },
];

export const LANGUAGES = [
  { value: "hindi", label: "Hindi" },
  { value: "english", label: "English" },
  { value: "punjabi", label: "Punjabi" },
  { value: "marathi", label: "Marathi" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "bengali", label: "Bengali" },
  { value: "instrumental", label: "Instrumental" },
  { value: "other", label: "Other" },
];

/** Report reasons (PRD F32) — values match the API. */
export const REPORT_REASONS = [
  { value: "copyright", label: "Copyright: this is someone else's music" },
  { value: "abuse", label: "Offensive, hateful or abusive" },
  { value: "explicit", label: "Explicit but not marked explicit" },
  { value: "spam", label: "Spam or misleading" },
  { value: "other", label: "Something else" },
];

/** How each track status is shown. `tone` picks the badge colour. */
export const TRACK_STATUS_META = {
  processing: { label: "Processing", tone: "info" },
  published: { label: "Live", tone: "success" },
  scheduled: { label: "Scheduled", tone: "warning" },
  unpublished: { label: "Draft", tone: "muted" },
  rejected: { label: "Rejected", tone: "danger" },
  taken_down: { label: "Taken down", tone: "danger" },
};

export const PROCESSING_META = {
  queued: { label: "Queued", tone: "info" },
  running: { label: "Processing", tone: "info" },
  done: { label: "Ready", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

export const RELEASE_OPTIONS = [
  { value: "publish", label: "Publish when ready" },
  { value: "schedule", label: "Schedule for later" },
  { value: "draft", label: "Save as draft" },
];

export const ALBUM_TYPES = [
  { value: "album", label: "Album" },
  { value: "ep", label: "EP" },
  { value: "single", label: "Single" },
];

/** Official (staff) vs Community (user uploads) — PRD 10.14. */
export const CATALOG_META = {
  official: { label: "Official", tone: "success" },
  community: { label: "Community", tone: "info" },
};

/** Poll processing tracks this often (ms). */
export const PROCESSING_POLL_MS = 3000;

/* ===== Player (Day 5) ===== */

/** Repeat modes, in the order the repeat button cycles through them (PRD PLY-1). */
export const REPEAT_MODES = ["off", "all", "one"];
/** ←/→ seek step in seconds (PRD PLY-5). */
export const SEEK_STEP_SECONDS = 5;
/** "Previous" restarts the song when more than this many seconds have played. */
export const RESTART_THRESHOLD_SECONDS = 3;
/** Start loading the next song this many seconds before the current one ends (BGP-5). */
export const PRELOAD_BEFORE_END_SECONDS = 25;
/** Fetch a fresh stream URL when the cached one expires within this time. */
export const STREAM_URL_REFRESH_MARGIN_MS = 5 * 60 * 1000;
/** Send queued listening events this often, plus on page hide / back online (BGP-7). */
export const LISTEN_FLUSH_INTERVAL_MS = 15 * 1000;
export const LISTEN_EVENTS_BATCH_SIZE = 50;
/** Keep at most this many unsent events in the browser. */
export const LISTEN_QUEUE_MAX = 500;
/** Browser storage keys: saved queue / settings, and unsent listening events. */
export const PLAYER_STORAGE_KEY = "sv_player";
export const LISTEN_QUEUE_STORAGE_KEY = "sv_listen_queue";

/* ===== Search, browse & voice (Day 7) ===== */

/** The All · Official · Community switch (PRD CAT-2), remembered per user. */
export const CATALOG_FILTERS = [
  { value: "all", label: "All" },
  { value: "official", label: "Official" },
  { value: "community", label: "Community" },
];
/** Search waits this long after the last keystroke (roadmap Day 7). */
export const SEARCH_DEBOUNCE_MS = 300;
/** Songs shown in a search group before "Show all". */
export const SEARCH_TRACKS_PREVIEW = 5;
/** Songs in a Home row (Trending, New Releases…). */
export const HOME_ROW_SIZE = 20;
/** Songs per page on genre / vibe pages. */
export const BROWSE_PAGE_SIZE = 30;
/** Voice recognition languages (PRD VOC-2: English + Hindi; Hinglish works in both). */
export const VOICE_LANGUAGES = [
  { value: "en-IN", label: "English", short: "EN" },
  { value: "hi-IN", label: "हिन्दी", short: "HI" },
];
/** Holding the mic this long switches from "tap" to "hold to talk" (ms). */
export const VOICE_HOLD_MS = 350;
/** Stop listening after this long without a result (ms). */
export const VOICE_TIMEOUT_MS = 8000;
/** How long a voice toast stays on screen (ms). */
export const VOICE_TOAST_MS = 3500;
/** Volume step for "volume up / down". */
export const VOICE_VOLUME_STEP = 0.15;
