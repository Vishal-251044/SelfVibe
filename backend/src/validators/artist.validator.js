/**
 * Zod schemas for creators ("Become a Creator"), admin artists and albums.
 */
import { z } from "zod";
import { ALBUM_TYPES } from "../config/constants.js";

const objectId = (label) => z.string().regex(/^[0-9a-f]{24}$/i, { error: `Invalid ${label}` });
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,40}$/, { error: "Invalid option" });
const imageKey = z
  .string()
  .regex(/^(?:[a-z0-9-]{1,32}\/)?incoming\/[su]-[0-9a-f]{24}\/[0-9a-f-]{36}\.(jpg|png|webp)$/, {
    error: "Upload the image first",
  });
const optionalUrl = z
  .union([
    z.url({ protocol: /^https?$/, error: "Enter a full link (https://…)" }).max(300),
    z.literal(""),
  ])
  .optional();

const stageName = z
  .string()
  .trim()
  .min(2, { error: "Use at least 2 characters" })
  .max(60, { error: "Use at most 60 characters" });

const socials = z
  .object({
    instagram: optionalUrl,
    youtube: optionalUrl,
    spotify: optionalUrl,
    x: optionalUrl,
    website: optionalUrl,
  })
  .partial()
  .optional();

/** POST /api/creator/become (PRD CRT-1). */
export const becomeCreatorSchema = z.object({
  stageName,
  bio: z.string().trim().max(1000).default(""),
  genres: z.array(slug).max(5).default([]),
  socials,
});

/** PATCH /api/creator/me */
export const updateCreatorSchema = z
  .object({
    stageName,
    bio: z.string().trim().max(1000),
    genres: z.array(slug).max(5),
    socials,
    avatarKey: imageKey,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });

const artistFields = {
  stageName,
  bio: z.string().trim().max(1000),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, { error: "Use a 2-letter country code" })
    .nullable(),
  genres: z.array(slug).max(5),
  vibes: z.array(slug).max(5),
  verified: z.boolean(),
  popularity: z.number().int().min(0).max(100),
  socials,
  avatarKey: imageKey,
};

/** POST /api/admin/artists */
export const adminCreateArtistSchema = z
  .object(artistFields)
  .partial()
  .required({ stageName: true });

/** PATCH /api/admin/artists/:id */
export const adminUpdateArtistSchema = z
  .object(artistFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });

export const listArtistsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  official: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const albumFields = {
  title: z.string().trim().min(1, { error: "Enter a title" }).max(150),
  type: z.enum(ALBUM_TYPES),
  releaseDate: z.coerce.date().nullable(),
  coverKey: imageKey,
};

/** POST /api/admin/albums */
export const adminCreateAlbumSchema = z
  .object({ artistId: objectId("artist"), ...albumFields })
  .partial({ type: true, releaseDate: true, coverKey: true });

/** PATCH /api/admin/albums/:id */
export const adminUpdateAlbumSchema = z
  .object(albumFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });

/** PUT /api/admin/albums/:id/tracks — tracks in play order */
export const albumTracksSchema = z.object({
  trackIds: z.array(objectId("track")).max(200),
});

export const idParamsSchema = z.object({ id: objectId("id") });
