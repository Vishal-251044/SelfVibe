/**
 * Zod schemas for uploads, tracks (creator + admin), bulk upload and reports.
 */
import { z } from "zod";
import {
  BULK_UPLOAD_MAX_FILES,
  CATALOGS,
  LANGUAGES,
  MOODS,
  PROCESSING_STATES,
  RELEASE_INTENTS,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  STREAM_QUALITIES,
  TRACK_ADDED_VIA,
  TRACK_STATUS,
} from "../config/constants.js";

const objectId = (label = "id") =>
  z.string().regex(/^[0-9a-f]{24}$/i, { error: `Invalid ${label}` });
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,40}$/, { error: "Invalid option" });
// Storage keys issued by /uploads/sign, optionally on a storage pool account
// ("<account>/incoming/…"); checked again against the owner in the service
const storageKey = z
  .string()
  .regex(/^(?:[a-z0-9-]{1,32}\/)?incoming\/[su]-[0-9a-f]{24}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/, {
    error: "Upload the file first",
  });

export const signUploadSchema = z.object({
  kind: z.enum(["audio", "image"]),
  contentType: z.string().trim().toLowerCase().max(100),
  sizeBytes: z.number().int().positive(),
  fileName: z.string().trim().max(255).optional(),
});

/** Editable metadata shared by every track form (PRD CRT-2). */
const metadataFields = {
  title: z
    .string()
    .trim()
    .min(1, { error: "Enter a title" })
    .max(150, { error: "Title is too long" }),
  genres: z
    .array(slug)
    .min(1, { error: "Pick at least one genre" })
    .max(5, { error: "Up to 5 genres" }),
  vibes: z.array(slug).max(5, { error: "Up to 5 vibes" }).default([]),
  mood: z.enum(MOODS).nullable().optional(),
  language: z.enum(LANGUAGES).nullable().optional(),
  explicit: z.boolean().default(false),
  lyrics: z.string().max(10000, { error: "Lyrics are too long" }).default(""),
  bpm: z.number().int().min(20).max(300).nullable().optional(),
};

/** POST /api/tracks — creator upload. */
export const creatorCreateTrackSchema = z.object({
  ...metadataFields,
  audioKey: storageKey,
  coverKey: storageKey.nullable().optional(),
  rightsConfirmed: z.literal(true, { error: "Confirm that you own the rights to this audio" }),
  // Used for the creator profile made on a user's first upload (PRD CRT-1)
  stageName: z
    .string()
    .trim()
    .min(2, { error: "Use at least 2 characters" })
    .max(60, { error: "Use at most 60 characters" })
    .optional(),
});

/** PATCH /api/tracks/:id — creator edit (no artist / release fields). */
export const creatorUpdateTrackSchema = z
  .object({
    title: metadataFields.title,
    genres: metadataFields.genres,
    vibes: z.array(slug).max(5),
    mood: metadataFields.mood,
    language: metadataFields.language,
    explicit: z.boolean(),
    lyrics: z.string().max(10000),
    bpm: metadataFields.bpm,
    coverKey: storageKey,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });

const releaseFields = {
  releaseIntent: z.enum(RELEASE_INTENTS).default("publish"),
  scheduledAt: z.coerce.date().nullable().optional(),
};

/** Scheduled releases must be in the future. */
const requireFutureSchedule = (value, ctx) => {
  if (
    value.releaseIntent === "schedule" &&
    (!value.scheduledAt || value.scheduledAt <= new Date())
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["scheduledAt"],
      message: "Choose a future date and time",
    });
  }
};

/** POST /api/admin/tracks — staff "add track" (PRD MUS-1, MUS-3). */
export const adminCreateTrackSchema = z
  .object({
    ...metadataFields,
    ...releaseFields,
    artistId: objectId("artist"),
    albumId: objectId("album").nullable().optional(),
    audioKey: storageKey,
    coverKey: storageKey.nullable().optional(),
  })
  .superRefine(requireFutureSchedule);

/** PATCH /api/admin/tracks/:id */
export const adminUpdateTrackSchema = z
  .object({
    title: metadataFields.title,
    genres: metadataFields.genres,
    vibes: z.array(slug).max(5),
    mood: metadataFields.mood,
    language: metadataFields.language,
    explicit: z.boolean(),
    lyrics: z.string().max(10000),
    bpm: metadataFields.bpm,
    artistId: objectId("artist"),
    albumId: objectId("album").nullable(),
    featured: z.boolean(),
    coverKey: storageKey,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });

export const scheduleSchema = z
  .object({ scheduledAt: z.coerce.date() })
  .refine((value) => value.scheduledAt > new Date(), {
    path: ["scheduledAt"],
    error: "Choose a future date and time",
  });

export const reprocessSchema = z.object({ audioKey: storageKey.optional() });

/** POST /api/admin/tracks/bulk (PRD MUS-2). */
export const bulkUploadSchema = z.object({
  files: z
    .array(z.object({ fileName: z.string().trim().min(1).max(255), audioKey: storageKey }))
    .min(1, { error: "Add at least one audio file" })
    .max(BULK_UPLOAD_MAX_FILES, { error: `Up to ${BULK_UPLOAD_MAX_FILES} files per upload` })
    .refine((files) => new Set(files.map((file) => file.audioKey)).size === files.length, {
      error: "The same file was added twice",
    }),
  csvText: z.string().max(500_000, { error: "The CSV is too large" }).nullable().optional(),
  defaults: z
    .object({
      artistId: objectId("artist").nullable().optional(),
      genres: z.array(slug).max(5).default([]),
      vibes: z.array(slug).max(5).default([]),
      ...releaseFields,
    })
    .superRefine(requireFutureSchedule)
    .default({ genres: [], vibes: [], releaseIntent: "publish" }),
});

export const listTracksQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(TRACK_STATUS).optional(),
  genre: slug.optional(),
  artistId: objectId("artist").optional(),
  addedVia: z.enum(TRACK_ADDED_VIA).optional(),
  processing: z.enum(PROCESSING_STATES).optional(),
  catalog: z.enum(CATALOGS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const streamQuerySchema = z.object({ quality: z.enum(STREAM_QUALITIES).optional() });

export const trackIdParamsSchema = z.object({ id: objectId("track") });

/** POST /api/reports (PRD F32). */
export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: objectId("item"),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).default(""),
});
