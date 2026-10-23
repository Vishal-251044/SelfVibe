/**
 * Admin catalog: artists and albums (PRD MUS-4, F23, F37).
 * /api/admin/artists/*, /api/admin/albums/*
 */
import * as artistService from "../services/artist.service.js";
import * as albumService from "../services/album.service.js";
import { assertUploaded, processCoverUpload } from "../services/mediaUpload.service.js";
import { assertTagsExist } from "../services/track.service.js";
import { toAlbum, toManagedArtist, toManagedTrack } from "../services/track.serializer.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/**
 * Check + process an uploaded image into a public cover.
 * @returns {Promise<string|undefined>} Public URL, or undefined when no image was sent
 */
async function coverFromUpload(req, imageKey, kind, id) {
  if (!imageKey) return undefined;
  await assertUploaded(imageKey, { staffId: req.staff.userId }, "image", "image");
  return (await processCoverUpload(imageKey, kind, String(id))).url;
}

/* ===== Artists ===== */

/** GET /api/admin/artists */
export const listArtists = asyncHandler(async (req, res) => {
  const { items, meta } = await artistService.listArtists(req.validated.query, req.validated.query);
  return sendSuccess(res, {
    message: "Artists fetched",
    data: {
      artists: items.map(({ artist, trackCount }) => toManagedArtist(artist, trackCount)),
      meta,
    },
  });
});

/** GET /api/admin/artists/:id — artist with albums */
export const getArtist = asyncHandler(async (req, res) => {
  const artist = await artistService.getArtistOrThrow(req.params.id);
  const albums = await albumService.listAlbumsForArtist(artist._id);
  return sendSuccess(res, {
    message: "Artist fetched",
    data: { artist: toManagedArtist(artist), albums: albums.map(toAlbum) },
  });
});

/** POST /api/admin/artists — create an official artist */
export const createArtist = asyncHandler(async (req, res) => {
  const { avatarKey, ...input } = req.body;
  await assertTagsExist(input);
  const artist = await artistService.createOfficialArtist(input, req.staff.userId);
  const avatar = await coverFromUpload(req, avatarKey, "artists", artist._id);
  if (avatar) {
    artist.avatar = avatar;
    artist.avatarCredit = { source: "Uploaded by staff", url: null };
    await artist.save();
  }
  req.audit({ action: "artist.create", targetType: "artist", targetId: artist._id, after: artist });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Artist created",
    data: { artist: toManagedArtist(artist, 0) },
  });
});

/** PATCH /api/admin/artists/:id — edit, verify, change photo */
export const updateArtist = asyncHandler(async (req, res) => {
  const { avatarKey, ...changes } = req.body;
  await assertTagsExist(changes);
  const avatar = await coverFromUpload(req, avatarKey, "artists", req.params.id);
  if (avatar)
    Object.assign(changes, { avatar, avatarCredit: { source: "Uploaded by staff", url: null } });
  const { artist, before } = await artistService.updateArtist(req.params.id, changes);
  req.audit({
    action: "artist.update",
    targetType: "artist",
    targetId: artist._id,
    before,
    after: artist,
  });
  return sendSuccess(res, { message: "Artist updated", data: { artist: toManagedArtist(artist) } });
});

/** DELETE /api/admin/artists/:id — official artists without tracks only */
export const deleteArtist = asyncHandler(async (req, res) => {
  const artist = await artistService.deleteArtist(req.params.id);
  req.audit({
    action: "artist.delete",
    targetType: "artist",
    targetId: artist._id,
    before: artist,
  });
  return sendSuccess(res, { message: "Artist deleted" });
});

/* ===== Albums ===== */

/** GET /api/admin/albums/:id — album with tracks in order */
export const getAlbum = asyncHandler(async (req, res) => {
  const { album, tracks } = await albumService.getAlbumWithTracks(req.params.id);
  return sendSuccess(res, {
    message: "Album fetched",
    data: { album: toAlbum(album), tracks: tracks.map(toManagedTrack) },
  });
});

/** POST /api/admin/albums */
export const createAlbum = asyncHandler(async (req, res) => {
  const { coverKey, ...input } = req.body;
  const album = await albumService.createAlbum(input, req.staff.userId);
  const coverUrl = await coverFromUpload(req, coverKey, "albums", album._id);
  if (coverUrl) {
    album.coverUrl = coverUrl;
    await album.save();
  }
  req.audit({ action: "album.create", targetType: "album", targetId: album._id, after: album });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Album created",
    data: { album: toAlbum(album) },
  });
});

/** PATCH /api/admin/albums/:id */
export const updateAlbum = asyncHandler(async (req, res) => {
  const { coverKey, ...changes } = req.body;
  const coverUrl = await coverFromUpload(req, coverKey, "albums", req.params.id);
  if (coverUrl) changes.coverUrl = coverUrl;
  const { album, before } = await albumService.updateAlbum(req.params.id, changes);
  req.audit({
    action: "album.update",
    targetType: "album",
    targetId: album._id,
    before,
    after: album,
  });
  return sendSuccess(res, { message: "Album updated", data: { album: toAlbum(album) } });
});

/** PUT /api/admin/albums/:id/tracks — set tracks and their order */
export const setAlbumTracks = asyncHandler(async (req, res) => {
  const { album, before } = await albumService.setAlbumTracks(req.params.id, req.body.trackIds);
  req.audit({
    action: "album.track_order",
    targetType: "album",
    targetId: album._id,
    before,
    after: { trackIds: album.trackIds },
  });
  return sendSuccess(res, { message: "Track order saved", data: { album: toAlbum(album) } });
});

/** DELETE /api/admin/albums/:id */
export const deleteAlbum = asyncHandler(async (req, res) => {
  const album = await albumService.deleteAlbum(req.params.id);
  req.audit({ action: "album.delete", targetType: "album", targetId: album._id, before: album });
  return sendSuccess(res, { message: "Album deleted" });
});
