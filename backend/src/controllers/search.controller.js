/**
 * Search endpoints (PRD SRC-1/2/3, VOC-4, roadmap Day 7):
 * GET /api/search · GET /api/search/voice · recent searches.
 */
import * as searchService from "../services/search.service.js";
import { mosaicCovers } from "../services/playlist.service.js";
import { toPublicArtist, toPublicTrack } from "../services/track.serializer.js";
import { toPlaylistSummary } from "../services/playlist.serializer.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/**
 * Genre / vibe as a search result.
 * @param {Object} item
 * @returns {Object}
 */
function toCategoryResult(item) {
  return {
    kind: item.kind,
    slug: item.slug,
    name: item.name,
    icon: item.icon,
    colour: item.colour,
    description: item.description ?? "",
  };
}

/**
 * Playlist cards with their cover mosaics.
 * @param {Object[]} playlists
 * @returns {Promise<Object[]>}
 */
async function toPlaylistResults(playlists) {
  const covers = await mosaicCovers(playlists);
  return playlists.map((playlist) => toPlaylistSummary(playlist, covers.get(String(playlist._id))));
}

/** GET /api/search?q=&catalog= — grouped results */
export const search = asyncHandler(async (req, res) => {
  const { q, catalog } = req.validated.query;
  const results = await searchService.search(q, { catalog, viewerId: req.auth?.userId ?? null });
  return sendSuccess(res, {
    message: "Search results",
    data: {
      query: q,
      catalog,
      tracks: results.tracks.map(toPublicTrack),
      artists: results.artists.map(toPublicArtist),
      playlists: await toPlaylistResults(results.playlists),
      categories: results.categories.map(toCategoryResult),
    },
  });
});

/** GET /api/search/voice?q=&catalog= — best match for "play <…>" */
export const voiceSearch = asyncHandler(async (req, res) => {
  const { q, catalog } = req.validated.query;
  const result = await searchService.voiceLookup(q, {
    catalog,
    viewerId: req.auth?.userId ?? null,
  });
  const playlistCovers = await mosaicCovers(
    result.candidates.filter((entry) => entry.type === "playlist").map((entry) => entry.item)
  );
  const serialise = (entry) => {
    if (!entry) return null;
    const { type, score, item } = entry;
    const shaped = {
      track: () => toPublicTrack(item),
      artist: () => toPublicArtist(item),
      playlist: () => toPlaylistSummary(item, playlistCovers.get(String(item._id)) ?? []),
    }[type];
    return {
      type,
      score: Math.min(1, Math.round(score * 100) / 100), // Official boost can pass 1
      item: shaped ? shaped() : toCategoryResult(item),
    };
  };
  const candidates = result.candidates.map(serialise);
  return sendSuccess(res, {
    message: result.best ? "Best match found" : `No match for '${q}'`,
    data: { query: q, confident: result.confident, best: candidates[0] ?? null, candidates },
  });
});

/** GET /api/search/recent */
export const listRecent = asyncHandler(async (req, res) => {
  const items = await searchService.getRecentSearches(req.auth.userId);
  return sendSuccess(res, { message: "Recent searches fetched", data: { items } });
});

/** POST /api/search/recent */
export const addRecent = asyncHandler(async (req, res) => {
  const items = await searchService.addRecentSearch(req.auth.userId, req.body.query);
  return sendSuccess(res, { message: "Search saved", data: { items } });
});

/** DELETE /api/search/recent?q= — one search, or all without q */
export const removeRecent = asyncHandler(async (req, res) => {
  const items = await searchService.removeRecentSearch(
    req.auth.userId,
    req.validated.query.q ?? null
  );
  return sendSuccess(res, { message: "Recent searches updated", data: { items } });
});
