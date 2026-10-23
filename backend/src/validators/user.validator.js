/**
 * Zod schemas for /api/users/me (profile edit and taste onboarding).
 */
import { z } from "zod";
import { ONBOARDING_LIMITS } from "../config/constants.js";

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,40}$/, {
    error: "Invalid option",
  });
const objectIdField = z.string().regex(/^[0-9a-f]{24}$/i, { error: "Invalid artist" });

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Enter your name" })
      .max(80, { error: "Name must be 80 characters or fewer" })
      .optional(),
    bio: z.string().trim().max(300, { error: "Bio must be 300 characters or fewer" }).optional(),
    // A Cloudinary URL from the avatar upload, or null to remove the photo
    avatar: z
      .union([z.url({ protocol: /^https$/, error: "Invalid photo URL" }).max(500), z.null()])
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });

const { minGenres, maxGenres, minVibes, maxVibes, maxArtists } = ONBOARDING_LIMITS;

export const onboardingSchema = z.object({
  genres: z
    .array(slugField)
    .min(minGenres, { error: `Pick at least ${minGenres} genres` })
    .max(maxGenres, { error: `Pick up to ${maxGenres} genres` }),
  vibes: z
    .array(slugField)
    .min(minVibes, { error: `Pick at least ${minVibes} vibes` })
    .max(maxVibes, { error: `Pick up to ${maxVibes} vibes` }),
  artists: z
    .array(objectIdField)
    .max(maxArtists, { error: `Pick up to ${maxArtists} artists` })
    .optional()
    .default([]),
});

/** Comma-separated slugs in a query string, e.g. ?genres=lo-fi,indie */
const slugListQuery = (max) =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : []))
    .pipe(z.array(slugField).max(max, { error: `Up to ${max} values` }));

export const artistSuggestionsQuerySchema = z.object({
  genres: slugListQuery(ONBOARDING_LIMITS.maxGenres),
  vibes: slugListQuery(ONBOARDING_LIMITS.maxVibes),
});
