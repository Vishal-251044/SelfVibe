/**
 * Browse endpoints (PRD BRW-1/2/3, roadmap Day 7):
 * /api/browse/genres, /api/browse/vibes (+ /:slug), /api/trending, /api/new-releases.
 */
import * as browseService from "../services/browse.service.js";
import { toPublicTrack } from "../services/track.serializer.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/**
 * GET /api/browse/genres or /api/browse/vibes
 * @param {"genre"|"vibe"} kind
 * @returns {import("express").RequestHandler}
 */
export const listCategories = (kind) =>
  asyncHandler(async (req, res) => {
    const items = await browseService.listCategories(kind, req.validated.query);
    return sendSuccess(res, {
      message: `${kind === "genre" ? "Genres" : "Vibes"} fetched`,
      data: { items },
    });
  });

/**
 * GET /api/browse/genres/:slug or /api/browse/vibes/:slug
 * @param {"genre"|"vibe"} kind
 * @returns {import("express").RequestHandler}
 */
export const getCategory = (kind) =>
  asyncHandler(async (req, res) => {
    const { category, items, meta } = await browseService.getCategoryPage(
      kind,
      req.validated.params.slug,
      req.validated.query
    );
    return sendSuccess(res, {
      message: `${category.name} fetched`,
      data: { category, items: items.map(toPublicTrack), meta },
    });
  });

/** GET /api/trending — most played in the last 7 days */
export const trending = asyncHandler(async (req, res) => {
  const results = await browseService.getTrending(req.validated.query);
  return sendSuccess(res, {
    message: "Trending fetched",
    data: {
      items: results.map(({ track, plays }) => ({ ...toPublicTrack(track), recentPlays: plays })),
    },
  });
});

/** GET /api/new-releases */
export const newReleases = asyncHandler(async (req, res) => {
  const { items, meta } = await browseService.getNewReleases(req.validated.query);
  return sendSuccess(res, {
    message: "New releases fetched",
    data: { items: items.map(toPublicTrack), meta },
  });
});
