/**
 * Listening endpoints (roadmap Day 5):
 * POST /api/events  — batched play / skip / complete / repeat events
 * GET  /api/history — the signed-in user's last plays
 */
import { getListeningHistory, recordListenEvents } from "../services/listening.service.js";
import { toPublicTrack } from "../services/track.serializer.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** POST /api/events */
export const postListenEvents = asyncHandler(async (req, res) => {
  const result = await recordListenEvents(req.auth.userId, req.validated.body.events);
  return sendSuccess(res, { message: "Events recorded", data: result });
});

/** GET /api/history */
export const getHistory = asyncHandler(async (req, res) => {
  const items = await getListeningHistory(req.auth.userId, req.validated.query.limit);
  return sendSuccess(res, {
    message: "History fetched",
    data: {
      items: items.map(({ playedAt, track }) => ({ playedAt, track: toPublicTrack(track) })),
    },
  });
});
