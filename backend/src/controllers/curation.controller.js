/**
 * Curation (roadmap Day 9): Home page sections and editorial playlists in the
 * console, plus the public GET /api/home/sections the Home page reads.
 */
import * as curationService from "../services/admin/curation.service.js";
import { toPublicArtist, toPublicTrack } from "../services/track.serializer.js";
import { toPlaylistSummary } from "../services/playlist.serializer.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/* ===== Console: Home sections ===== */

/** GET /api/admin/home-sections */
export const listSections = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Home sections fetched",
    data: { items: await curationService.listHomeSections() },
  });
});

/** POST /api/admin/home-sections */
export const createSection = asyncHandler(async (req, res) => {
  const item = await curationService.createHomeSection(req.body, req.staff.userId);
  req.audit({
    action: "home_section.create",
    targetType: "homeSection",
    targetId: item.id,
    after: item,
  });
  return sendSuccess(res, { statusCode: 201, message: "Section added", data: { item } });
});

/** PATCH /api/admin/home-sections/:id */
export const updateSection = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { before, after } = await curationService.updateHomeSection(id, req.body, req.staff.userId);
  req.audit({
    action: "home_section.update",
    targetType: "homeSection",
    targetId: id,
    before,
    after,
  });
  return sendSuccess(res, { message: "Section saved", data: { item: after } });
});

/** PUT /api/admin/home-sections/order */
export const reorderSections = asyncHandler(async (req, res) => {
  const items = await curationService.reorderHomeSections(req.body.ids);
  req.audit({
    action: "home_section.reorder",
    targetType: "homeSection",
    after: { ids: req.body.ids },
  });
  return sendSuccess(res, { message: "Order saved", data: { items } });
});

/** DELETE /api/admin/home-sections/:id */
export const deleteSection = asyncHandler(async (req, res) => {
  const section = await curationService.deleteHomeSection(req.validated.params.id);
  req.audit({
    action: "home_section.delete",
    targetType: "homeSection",
    targetId: section.id,
    before: section,
  });
  return sendSuccess(res, { message: "Section deleted", data: null });
});

/* ===== Console: editorial playlists ===== */

/** GET /api/admin/editorial-playlists */
export const listEditorial = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Editorial playlists fetched",
    data: { items: await curationService.listEditorialPlaylists() },
  });
});

/** POST /api/admin/editorial-playlists */
export const createEditorial = asyncHandler(async (req, res) => {
  const item = await curationService.createEditorialPlaylist(req.body);
  req.audit({
    action: "editorial_playlist.create",
    targetType: "playlist",
    targetId: item.id,
    after: item,
  });
  return sendSuccess(res, { statusCode: 201, message: "Playlist created", data: { item } });
});

/** PATCH /api/admin/editorial-playlists/:id */
export const updateEditorial = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { before, after } = await curationService.updateEditorialPlaylist(id, req.body);
  req.audit({
    action: "editorial_playlist.update",
    targetType: "playlist",
    targetId: id,
    before,
    after,
  });
  return sendSuccess(res, { message: "Playlist saved", data: { item: after } });
});

/** DELETE /api/admin/editorial-playlists/:id */
export const deleteEditorial = asyncHandler(async (req, res) => {
  const item = await curationService.deleteEditorialPlaylist(req.validated.params.id);
  req.audit({
    action: "editorial_playlist.delete",
    targetType: "playlist",
    targetId: item.id,
    before: item,
  });
  return sendSuccess(res, { message: "Playlist deleted", data: null });
});

/* ===== Public ===== */

/** GET /api/home/sections?catalog= — what Home shows */
export const publicSections = asyncHandler(async (req, res) => {
  const sections = await curationService.getPublicHomeSections(req.validated.query);
  return sendSuccess(res, {
    message: "Home sections fetched",
    data: {
      sections: sections.map(({ tracks, artists, playlist, covers, ...section }) => ({
        ...section,
        ...(tracks && { tracks: tracks.map(toPublicTrack) }),
        ...(artists && { artists: artists.map(toPublicArtist) }),
        ...(playlist && { playlist: toPlaylistSummary(playlist, covers) }),
      })),
    },
  });
});
