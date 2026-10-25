/**
 * Share request validation (roadmap Day 10).
 */
import { z } from "zod";
import { SHARE_CHANNELS, SHARE_TARGET_TYPES } from "../config/constants.js";

export const shareSchema = z.object({
  targetType: z.enum(SHARE_TARGET_TYPES),
  targetId: z.string().regex(/^[0-9a-f]{24}$/i, { error: "Invalid id" }),
  channel: z.enum(SHARE_CHANNELS).default("native"),
});
