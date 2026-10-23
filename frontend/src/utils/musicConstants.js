/**
 * Music constants shared by the creator studio, the artist page and the
 * Admin Console music manager. Limits mirror the API (backend config/constants.js)
 * so the browser can reject a bad file before uploading it.
 */

/** Audio uploads (PRD CRT-3): MP3 / WAV / FLAC, up to 50 MB. */
export const AUDIO_UPLOAD = {
  maxBytes: 50 * 1024 * 1024,
  accept: ".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/x-flac",
  mimeTypes: {
    "audio/mpeg": "audio/mpeg",
    "audio/mp3": "audio/mpeg",
    "audio/wav": "audio/wav",
    "audio/x-wav": "audio/wav",
    "audio/wave": "audio/wav",
    "audio/flac": "audio/flac",
    "audio/x-flac": "audio/flac",
  },
  // Some browsers leave file.type empty for FLAC — fall back to the extension
  extensions: { mp3: "audio/mpeg", wav: "audio/wav", flac: "audio/flac" },
  label: "MP3, WAV or FLAC · up to 50 MB",
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

/** Poll processing tracks this often (ms). */
export const PROCESSING_POLL_MS = 3000;
