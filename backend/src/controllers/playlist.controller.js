/**
 * Playlist endpoints (PRD LIB-2, roadmap Day 6): /api/playlists/*
 */
import * as playlistService from "../services/playlist.service.js";
import { assertUploaded } from "../services/mediaUpload.service.js";
import { toPlaylistDetail, toPlaylistSummary } from "../services/playlist.serializer.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/**
 * Reply with the playlist as the owner sees it.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {string} message
 * @param {number} [statusCode=200]
 */
async function sendPlaylist(req, res, message, statusCode = 200) {
  const detail = await playlistService.getPlaylist(req.params.id ?? req.createdId, req.auth.userId);
  return sendSuccess(res, { statusCode, message, data: { playlist: toPlaylistDetail(detail) } });
}

/** GET /api/playlists — my playlists */
export const listMine = asyncHandler(async (req, res) => {
  const items = await playlistService.listMyPlaylists(req.auth.userId);
  return sendSuccess(res, {
    message: "Playlists fetched",
    data: { playlists: items.map(({ playlist, covers }) => toPlaylistSummary(playlist, covers)) },
  });
});

/** POST /api/playlists */
export const create = asyncHandler(async (req, res) => {
  const playlist = await playlistService.createPlaylist(req.auth.userId, req.validated.body);
  req.createdId = String(playlist._id);
  return sendPlaylist(req, res, "Playlist created", 201);
});

/** GET /api/playlists/:id — owner, or anyone for a public playlist */
export const getOne = asyncHandler(async (req, res) => {
  const detail = await playlistService.getPlaylist(req.params.id, req.auth?.userId ?? null);
  return sendSuccess(res, {
    message: "Playlist fetched",
    data: { playlist: toPlaylistDetail(detail) },
  });
});

/** PATCH /api/playlists/:id */
export const update = asyncHandler(async (req, res) => {
  const { coverKey } = req.validated.body;
  if (coverKey) await assertUploaded(coverKey, { userId: req.auth.userId }, "image", "coverKey");
  await playlistService.updatePlaylist(req.params.id, req.auth.userId, req.validated.body);
  return sendPlaylist(req, res, "Playlist updated");
});

/** DELETE /api/playlists/:id */
export const remove = asyncHandler(async (req, res) => {
  await playlistService.deletePlaylist(req.params.id, req.auth.userId);
  return sendSuccess(res, { message: "Playlist deleted" });
});

/** POST /api/playlists/:id/tracks — add songs */
export const addTracks = asyncHandler(async (req, res) => {
  const { playlist, added } = await playlistService.addTracks(
    req.params.id,
    req.auth.userId,
    req.validated.body.trackIds
  );
  return sendSuccess(res, {
    message: added ? "Added to playlist" : "Already in this playlist",
    data: { playlist: toPlaylistSummary(playlist), added },
  });
});

/** DELETE /api/playlists/:id/tracks/:trackId */
export const removeTrack = asyncHandler(async (req, res) => {
  await playlistService.removeTrack(req.params.id, req.auth.userId, req.params.trackId);
  return sendPlaylist(req, res, "Removed from playlist");
});

/** PUT /api/playlists/:id/tracks — new order */
export const reorderTracks = asyncHandler(async (req, res) => {
  await playlistService.reorderTracks(req.params.id, req.auth.userId, req.validated.body.trackIds);
  return sendPlaylist(req, res, "Playlist order saved");
});
