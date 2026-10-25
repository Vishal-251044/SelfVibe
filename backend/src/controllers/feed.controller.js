/**
 * For You feed endpoints (PRD 10.4, roadmap Day 8):
 * GET /api/feed/for-you · POST /api/feed/not-interested · DELETE /api/feed/not-interested/:trackId
 */
import * as feedService from "../services/recommendation/feed.service.js";
import { toPublicTrack } from "../services/track.serializer.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** GET /api/feed/for-you */
export const forYou = asyncHandler(async (req, res) => {
  const feed = await feedService.getForYouFeed(req.auth.userId, req.validated.query);
  return sendSuccess(res, {
    message: "Feed fetched",
    data: {
      generatedAt: feed.generatedAt,
      cached: feed.cached,
      sections: feed.sections.map((section) => ({
        ...section,
        // "Why this?" travels with each song
        items: section.items.map(({ track, reason }) => ({ ...toPublicTrack(track), reason })),
      })),
    },
  });
});

/** POST /api/feed/not-interested */
export const notInterested = asyncHandler(async (req, res) => {
  const result = await feedService.markNotInterested(req.auth.userId, req.body.trackId);
  return sendSuccess(res, { message: "We'll show you less like this", data: result });
});

/** DELETE /api/feed/not-interested/:trackId — undo */
export const undoNotInterested = asyncHandler(async (req, res) => {
  const result = await feedService.undoNotInterested(req.auth.userId, req.validated.params.trackId);
  return sendSuccess(res, { message: "Song is back in your recommendations", data: result });
});
