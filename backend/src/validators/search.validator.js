/**
 * Zod schemas for search, browse and voice (roadmap Day 7).
 */
import { z } from "zod";
import {
  BROWSE_PAGE_SIZE,
  CATALOG_FILTERS,
  SEARCH_QUERY_MAX,
  VOICE_INTENTS,
  VOICE_LANGUAGES,
  VOICE_OUTCOMES,
  VOICE_TRANSCRIPT_MAX,
} from "../config/constants.js";

const catalog = z
  .enum(CATALOG_FILTERS, { error: "Choose all, official or community" })
  .default("all");
const searchText = z
  .string()
  .trim()
  .min(1, { error: "Type something to search" })
  .max(SEARCH_QUERY_MAX, { error: `Use at most ${SEARCH_QUERY_MAX} characters` });

/** GET /api/search?q=&catalog= · GET /api/search/voice?q=&catalog= */
export const searchQuerySchema = z.object({ q: searchText, catalog });

/** POST /api/search/recent */
export const recentSearchBodySchema = z.object({ query: searchText });

/** DELETE /api/search/recent?q= (no q = clear all) */
export const recentSearchDeleteQuerySchema = z.object({ q: searchText.optional() });

/** GET /api/browse/genres?catalog= */
export const catalogQuerySchema = z.object({ catalog });

/** GET /api/browse/genres/:slug, /api/browse/vibes/:slug */
export const categoryParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{1,60}$/, { error: "Invalid category" }),
});

/** Paged song lists: genre / vibe pages, new releases. */
export const browsePageQuerySchema = z.object({
  catalog,
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(BROWSE_PAGE_SIZE),
  sort: z.enum(["popular", "new"]).default("popular"),
});

/** GET /api/trending */
export const trendingQuerySchema = z.object({
  catalog,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** POST /api/voice/log — text only (PRD VOC-6) */
export const voiceLogSchema = z.object({
  transcript: z.string().trim().min(1).max(VOICE_TRANSCRIPT_MAX),
  language: z.enum(VOICE_LANGUAGES),
  intent: z.enum(VOICE_INTENTS),
  outcome: z.enum(VOICE_OUTCOMES),
  confidence: z.number().min(0).max(1).nullable().optional(),
  latencyMs: z.number().int().min(0).max(60000).nullable().optional(),
});
