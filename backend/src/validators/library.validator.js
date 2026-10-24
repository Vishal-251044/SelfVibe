/**
 * Zod schemas for likes, follows, playlists and comments (roadmap Day 6).
 */
import { z } from "zod";
import {
  COMMENT_MAX_LENGTH,
  COMMENT_SORTS,
  PLAYLIST_DESCRIPTION_MAX,
  PLAYLIST_MAX_TRACKS,
  PLAYLIST_NAME_MAX,
  REPORT_REASONS,
} from "../config/constants.js";

const objectId = (label) => z.string().regex(/^[0-9a-f]{24}$/i, { error: `Invalid ${label}` });
const imageKey = z
  .string()
  .regex(/^(?:[a-z0-9-]{1,32}\/)?incoming\/u-[0-9a-f]{24}\/[0-9a-f-]{36}\.(jpg|png|webp)$/, {
    error: "Upload the image first",
  });

export const trackIdParamsSchema = z.object({ trackId: objectId("song") });
export const artistIdParamsSchema = z.object({ artistId: objectId("artist") });
export const idParamsSchema = z.object({ id: objectId("id") });
export const playlistTrackParamsSchema = z.object({
  id: objectId("playlist"),
  trackId: objectId("song"),
});

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/* ===== Playlists (LIB-2) ===== */

const playlistName = z
  .string()
  .trim()
  .min(1, { error: "Give your playlist a name" })
  .max(PLAYLIST_NAME_MAX, { error: `Use at most ${PLAYLIST_NAME_MAX} characters` });
const playlistDescription = z
  .string()
  .trim()
  .max(PLAYLIST_DESCRIPTION_MAX, { error: `Use at most ${PLAYLIST_DESCRIPTION_MAX} characters` });

/** POST /api/playlists */
export const createPlaylistSchema = z.object({
  name: playlistName,
  description: playlistDescription.default(""),
  isPublic: z.boolean().default(false),
});

/** PATCH /api/playlists/:id — coverKey null removes the uploaded cover */
export const updatePlaylistSchema = z
  .object({
    name: playlistName,
    description: playlistDescription,
    isPublic: z.boolean(),
    coverKey: imageKey.nullable(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });

/** POST /api/playlists/:id/tracks */
export const addPlaylistTracksSchema = z.object({
  trackIds: z.array(objectId("song")).min(1).max(PLAYLIST_MAX_TRACKS),
});

/** PUT /api/playlists/:id/tracks — the full list in the new order */
export const reorderPlaylistSchema = z.object({
  trackIds: z.array(objectId("song")).max(PLAYLIST_MAX_TRACKS),
});

/* ===== Comments (CMT-1–3) ===== */

const commentBody = z
  .string()
  .trim()
  .min(1, { error: "Write something first" })
  .max(COMMENT_MAX_LENGTH, { error: `Keep it under ${COMMENT_MAX_LENGTH} characters` });

/** GET /api/tracks/:id/comments */
export const listCommentsQuerySchema = pageQuerySchema.extend({
  sort: z.enum(COMMENT_SORTS).default("newest"),
});

/** POST /api/tracks/:id/comments */
export const createCommentSchema = z.object({
  body: commentBody,
  parentId: objectId("comment").nullable().optional(),
});

/** PATCH /api/comments/:id */
export const updateCommentSchema = z.object({ body: commentBody });

/** POST /api/comments/:id/report */
export const reportCommentSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).default(""),
});
