/**
 * Track endpoints for listeners and creators: /api/tracks/*, /api/creator/tracks
 * - Listeners: track details, signed stream URL (PLY-4).
 * - Creators: upload (create), list, edit, publish / unpublish, delete their own tracks.
 */
import * as trackService from "../services/track.service.js";
import { assertUploaded } from "../services/mediaUpload.service.js";
import { requireMyArtistProfile } from "../services/creator.service.js";
import { toManagedTrack, toPublicTrack } from "../services/track.serializer.js";
import { User } from "../models/user.model.js";
import { ERROR_CODES } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/**
 * Load a track the signed-in creator uploaded, or 404 (never reveal others' drafts).
 * @param {import("express").Request} req
 * @returns {Promise<Object>}
 */
async function getOwnTrack(req) {
  const track = await trackService.getTrackOrThrow(req.params.id);
  if (String(track.uploadedBy) !== req.auth.userId || track.addedVia !== "creator") {
    throw ApiError.notFound(`Track not found: ${req.params.id}`, { code: ERROR_CODES.NOT_FOUND });
  }
  return track;
}

/** GET /api/tracks/:id — published track details (public) */
export const getTrack = asyncHandler(async (req, res) => {
  const track = await trackService.getPublishedTrack(req.params.id);
  return sendSuccess(res, { message: "Track fetched", data: { track: toPublicTrack(track) } });
});

/** GET /api/tracks/:id/stream — short-lived signed audio URL */
export const getStream = asyncHandler(async (req, res) => {
  const viewer = await User.findById(req.auth.userId).select("plan").lean();
  const stream = await trackService.getStreamUrl(
    req.params.id,
    { userId: req.auth.userId, plan: viewer?.plan },
    req.validated.query
  );
  return sendSuccess(res, { message: "Stream ready", data: stream });
});

/** POST /api/tracks — creator upload (CRT-2) */
export const createTrack = asyncHandler(async (req, res) => {
  const artist = await requireMyArtistProfile(req.auth.userId);
  const owner = { userId: req.auth.userId };
  const { audioKey, coverKey, rightsConfirmed, ...metadata } = req.body;

  await assertUploaded(audioKey, owner, "audio", "audioKey");
  if (coverKey) await assertUploaded(coverKey, owner, "image", "coverKey");

  const track = await trackService.createTrack({
    artistId: artist._id,
    uploadedBy: req.auth.userId,
    audioKey,
    coverKey,
    metadata,
    addedVia: "creator",
    releaseIntent: "publish", // open uploads (PRD Q4): live as soon as processing finishes
    rightsConfirmed,
  });
  const created = await trackService.getTrackOrThrow(track._id);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Upload received — your track is processing",
    data: { track: toManagedTrack(created) },
  });
});

/** GET /api/creator/tracks — the creator's own tracks, any status */
export const listMyTracks = asyncHandler(async (req, res) => {
  const { items, meta } = await trackService.listTracks(
    { uploadedBy: req.auth.userId, addedVia: "creator", ...req.validated.query },
    req.validated.query
  );
  return sendSuccess(res, {
    message: "Tracks fetched",
    data: { tracks: items.map(toManagedTrack), meta },
  });
});

/** PATCH /api/tracks/:id — edit own track metadata / cover */
export const updateMyTrack = asyncHandler(async (req, res) => {
  await getOwnTrack(req);
  const { coverKey, ...changes } = req.body;
  if (coverKey) await assertUploaded(coverKey, { userId: req.auth.userId }, "image", "coverKey");
  const { track } = await trackService.updateTrack(req.params.id, changes, { coverKey });
  return sendSuccess(res, { message: "Track updated", data: { track: toManagedTrack(track) } });
});

/** POST /api/tracks/:id/publish | /unpublish — creators control their own releases */
export const changeMyRelease = (action) =>
  asyncHandler(async (req, res) => {
    await getOwnTrack(req);
    const { track } = await trackService.changeRelease(req.params.id, action);
    return sendSuccess(res, {
      message: action === "publish" ? "Track published" : "Track unpublished",
      data: { track: toManagedTrack(await trackService.getTrackOrThrow(track._id)) },
    });
  });

/** DELETE /api/tracks/:id — delete own track and its files */
export const deleteMyTrack = asyncHandler(async (req, res) => {
  await getOwnTrack(req);
  await trackService.deleteTrack(req.params.id);
  return sendSuccess(res, { message: "Track deleted" });
});
