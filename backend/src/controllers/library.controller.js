/**
 * Library endpoints (PRD LIB-1, LIB-4, roadmap Day 6):
 * likes (/api/likes) and follows (/api/follow, /api/follows).
 */
import * as libraryService from "../services/library.service.js";
import { toPublicArtist, toPublicTrack } from "../services/track.serializer.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** POST /api/likes/:trackId */
export const likeTrack = asyncHandler(async (req, res) => {
  const result = await libraryService.likeTrack(req.auth.userId, req.params.trackId);
  return sendSuccess(res, { message: "Added to Liked Songs", data: result });
});

/** DELETE /api/likes/:trackId */
export const unlikeTrack = asyncHandler(async (req, res) => {
  const result = await libraryService.unlikeTrack(req.auth.userId, req.params.trackId);
  return sendSuccess(res, { message: "Removed from Liked Songs", data: result });
});

/** GET /api/likes — Liked Songs, newest first */
export const listLikes = asyncHandler(async (req, res) => {
  const { items, meta } = await libraryService.listLikedTracks(
    req.auth.userId,
    req.validated.query
  );
  return sendSuccess(res, {
    message: "Liked songs fetched",
    data: {
      items: items.map(({ likedAt, track }) => ({ likedAt, track: toPublicTrack(track) })),
      meta,
    },
  });
});

/** GET /api/likes/ids — every liked song id (heart icons) */
export const listLikeIds = asyncHandler(async (req, res) => {
  const trackIds = await libraryService.listLikedTrackIds(req.auth.userId);
  return sendSuccess(res, { message: "Liked song ids fetched", data: { trackIds } });
});

/** POST /api/follow/:artistId */
export const followArtist = asyncHandler(async (req, res) => {
  const result = await libraryService.followArtist(req.auth.userId, req.params.artistId);
  return sendSuccess(res, { message: "Following", data: result });
});

/** DELETE /api/follow/:artistId */
export const unfollowArtist = asyncHandler(async (req, res) => {
  const result = await libraryService.unfollowArtist(req.auth.userId, req.params.artistId);
  return sendSuccess(res, { message: "Unfollowed", data: result });
});

/** GET /api/follows — artists I follow */
export const listFollows = asyncHandler(async (req, res) => {
  const { items, meta } = await libraryService.listFollowedArtists(
    req.auth.userId,
    req.validated.query
  );
  return sendSuccess(res, {
    message: "Following fetched",
    data: {
      items: items.map(({ followedAt, artist }) => ({
        followedAt,
        artist: toPublicArtist(artist),
      })),
      meta,
    },
  });
});

/** GET /api/follows/ids — every followed artist id (Follow buttons) */
export const listFollowIds = asyncHandler(async (req, res) => {
  const artistIds = await libraryService.listFollowedArtistIds(req.auth.userId);
  return sendSuccess(res, { message: "Followed artist ids fetched", data: { artistIds } });
});
