/**
 * Zod schemas for listening events, history and batch stream URLs (roadmap Day 5).
 */
import { z } from "zod";
import {
  LISTEN_DEVICES,
  LISTEN_EVENT_KINDS,
  LISTEN_EVENTS_MAX_BATCH,
  LISTEN_HISTORY_LIMIT,
  LISTEN_SOURCES,
  STREAM_BATCH_MAX,
} from "../config/constants.js";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, { error: "Invalid track" });
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

const listenEventSchema = z.object({
  sessionId: z.string().regex(/^[0-9a-zA-Z-]{8,64}$/, { error: "Invalid session" }),
  trackId: objectId,
  kind: z.enum(LISTEN_EVENT_KINDS),
  repeat: z.boolean().optional(),
  msListened: z.number().int().min(0).max(FOUR_HOURS_MS).optional(),
  percent: z.number().min(0).max(100).optional(),
  // Unknown sources are stored as "other" rather than rejecting the whole batch
  source: z
    .string()
    .max(30)
    .transform((value) => (LISTEN_SOURCES.includes(value) ? value : "other"))
    .optional(),
  device: z.enum(LISTEN_DEVICES).optional(),
  hour: z.number().int().min(0).max(23).optional(), // the listener's local hour (PRD 10.4.1 context)
  at: z.coerce.date().optional(),
});

/** POST /api/events */
export const listenEventsSchema = z.object({
  events: z
    .array(listenEventSchema)
    .min(1, { error: "No events" })
    .max(LISTEN_EVENTS_MAX_BATCH, {
      error: `Send at most ${LISTEN_EVENTS_MAX_BATCH} events at once`,
    }),
});

/** GET /api/history */
export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LISTEN_HISTORY_LIMIT).optional(),
});

/** POST /api/tracks/streams — signed URLs for the upcoming queue */
export const streamBatchSchema = z.object({
  trackIds: z.array(objectId).min(1).max(STREAM_BATCH_MAX),
});
