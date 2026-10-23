/**
 * Track endpoints for listeners and creators: /api/tracks/*, /api/creator/tracks
 * - Listeners: track details, signed stream URL (PLY-4).
 * - Any signed-in user: upload (the first upload creates the creator profile — PRD CRT-1),
 *   upload allowance (CRT-8), and list / edit / publish / unpublish / delete their own tracks.
 */
import * as trackService from "../services/track.service.js";
import { assertUploaded } from "../services/mediaUpload.service.js";
import { becomeCreator, getMyArtistProfile } from "../services/creator.service.js";
import { toPublicUser } from "../services/user.service.js";
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

/** POST /api/tracks — community upload by any signed-in user (CRT-1, CRT-2, CRT-8) */
export const createTrack = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.userId).select("name plan");
  if (!user) throw ApiError.unauthorized("Please log in again");
  const owner = { userId: req.auth.userId };
  const { audioKey, coverKey, rightsConfirmed, stageName, ...metadata } = req.body;

  await trackService.assertCanUpload({ userId: req.auth.userId, plan: user.plan });
  await assertUploaded(audioKey, owner, "audio", "audioKey");
  if (coverKey) await assertUploaded(coverKey, owner, "image", "coverKey");

  // First upload: turn on the simple creator profile (no approval needed)
  let artist = await getMyArtistProfile(req.auth.userId);
  let newCreator = null;
  if (!artist) {
    newCreator = await becomeCreator(req.auth.userId, { stageName: stageName || user.name });
    artist = newCreator.artist;
  }

  const track = await trackService.createTrack({
    artistId: artist._id,
    uploadedBy: req.auth.userId,
    audioKey,
    coverKey,
    metadata,
    addedVia: "creator",
    catalog: "community",
    releaseIntent: "publish", // open uploads (PRD Q4): live as soon as processing finishes
    rightsConfirmed,
  });
  const created = await trackService.getTrackOrThrow(track._id);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Upload received — your track is processing",
    // On the first upload the user gained the creator role: the client refreshes its session
    data: {
      track: toManagedTrack(created),
      user: newCreator ? toPublicUser(newCreator.user) : null,
    },
  });
});

/** GET /api/creator/usage — songs used / limit and storage used (CRT-8) */
export const getMyUploadUsage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.userId).select("plan").lean();
  const usage = await trackService.getUploadUsage({ userId: req.auth.userId, plan: user?.plan });
  return sendSuccess(res, { message: "Upload usage fetched", data: usage });
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
