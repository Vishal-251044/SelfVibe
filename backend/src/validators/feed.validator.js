/**
 * Zod schemas for the For You feed (roadmap Day 8).
 */
import { z } from "zod";
import { CATALOG_FILTERS } from "../config/constants.js";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, { error: "Invalid song" });

/** GET /api/feed/for-you?catalog=&hour=&refresh= */
export const forYouQuerySchema = z.object({
  catalog: z.enum(CATALOG_FILTERS).default("all"),
  // The listener's local hour, for "Right now: <vibe>"
  hour: z.coerce.number().int().min(0).max(23).optional(),
  refresh: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

/** POST /api/feed/not-interested */
export const notInterestedSchema = z.object({ trackId: objectId });

/** DELETE /api/feed/not-interested/:trackId */
export const notInterestedParamsSchema = z.object({ trackId: objectId });
