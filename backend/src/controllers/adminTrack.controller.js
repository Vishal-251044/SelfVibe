/**
 * Admin music manager: /api/admin/tracks/* (PRD §10.9.3 MUS-1…MUS-6).
 * Every write is described for the audit log via req.audit().
 */
import * as trackService from "../services/track.service.js";
import * as bulkImportService from "../services/bulkImport.service.js";
import { assertUploaded } from "../services/mediaUpload.service.js";
import { toManagedTrack } from "../services/track.serializer.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const RELEASE_MESSAGES = {
  publish: "Track published",
  unpublish: "Track unpublished",
  schedule: "Release scheduled",
};

/** Who is uploading (staff uploads live under their own key prefix). */
const staffOwner = (req) => ({ staffId: req.staff.userId });

/** GET /api/admin/tracks — search + filters + pagination */
export const listTracks = asyncHandler(async (req, res) => {
  const { items, meta } = await trackService.listTracks(req.validated.query, req.validated.query);
  return sendSuccess(res, {
    message: "Tracks fetched",
    data: { tracks: items.map(toManagedTrack), meta },
  });
});

/** GET /api/admin/tracks/:id */
export const getTrack = asyncHandler(async (req, res) => {
  const track = await trackService.getTrackOrThrow(req.params.id);
  return sendSuccess(res, { message: "Track fetched", data: { track: toManagedTrack(track) } });
});

/** POST /api/admin/tracks — add one track (addedVia: admin, publish / schedule / draft) */
export const createTrack = asyncHandler(async (req, res) => {
  const { audioKey, coverKey, artistId, releaseIntent, scheduledAt, ...metadata } = req.body;
  await assertUploaded(audioKey, staffOwner(req), "audio", "audioKey");
  if (coverKey) await assertUploaded(coverKey, staffOwner(req), "image", "coverKey");

  const created = await trackService.createTrack({
    artistId,
    uploadedBy: req.staff.userId,
    audioKey,
    coverKey,
    metadata,
    addedVia: "admin",
    releaseIntent,
    scheduledAt,
    rightsConfirmed: true,
  });
  const track = await trackService.getTrackOrThrow(created._id);
  req.audit({ action: "track.create", targetType: "track", targetId: track._id, after: track });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Track added — processing",
    data: { track: toManagedTrack(track) },
  });
});

/** PATCH /api/admin/tracks/:id — edit metadata / cover / artist / album */
export const updateTrack = asyncHandler(async (req, res) => {
  const { coverKey, ...changes } = req.body;
  if (coverKey) await assertUploaded(coverKey, staffOwner(req), "image", "coverKey");
  const { track, before } = await trackService.updateTrack(req.params.id, changes, { coverKey });
  req.audit({
    action: "track.update",
    targetType: "track",
    targetId: track._id,
    before,
    after: track,
  });
  return sendSuccess(res, { message: "Track updated", data: { track: toManagedTrack(track) } });
});

/**
 * POST /api/admin/tracks/:id/publish | /unpublish | /schedule
 * @param {"publish"|"unpublish"|"schedule"} action
 */
export const changeRelease = (action) =>
  asyncHandler(async (req, res) => {
    const { track, before } = await trackService.changeRelease(
      req.params.id,
      action,
      req.body?.scheduledAt
    );
    req.audit({
      action: `track.${action}`,
      targetType: "track",
      targetId: track._id,
      before,
      after: { status: track.status, scheduledAt: track.scheduledAt },
    });
    const fresh = await trackService.getTrackOrThrow(track._id);
    return sendSuccess(res, {
      message: RELEASE_MESSAGES[action],
      data: { track: toManagedTrack(fresh) },
    });
  });

/** POST /api/admin/tracks/:id/reprocess — retry processing, optionally with replaced audio */
export const reprocessTrack = asyncHandler(async (req, res) => {
  if (req.body.audioKey)
    await assertUploaded(req.body.audioKey, staffOwner(req), "audio", "audioKey");
  const track = await trackService.reprocessTrack(req.params.id, req.body.audioKey);
  req.audit({
    action: req.body.audioKey ? "track.replace_audio" : "track.reprocess",
    targetType: "track",
    targetId: track._id,
  });
  return sendSuccess(res, {
    message: "Processing restarted",
    data: { track: toManagedTrack(await trackService.getTrackOrThrow(track._id)) },
  });
});

/** DELETE /api/admin/tracks/:id */
export const deleteTrack = asyncHandler(async (req, res) => {
  const track = await trackService.deleteTrack(req.params.id);
  req.audit({ action: "track.delete", targetType: "track", targetId: track._id, before: track });
  return sendSuccess(res, { message: "Track deleted" });
});

/** GET /api/admin/tracks/:id/stream — staff preview of any track (incl. drafts) */
export const previewStream = asyncHandler(async (req, res) => {
  const stream = await trackService.getStreamUrl(
    req.params.id,
    { userId: req.staff.userId, isStaff: true },
    req.validated.query
  );
  return sendSuccess(res, { message: "Stream ready", data: stream });
});

/** POST /api/admin/tracks/bulk — start a bulk upload (files + optional CSV) */
export const startBulkUpload = asyncHandler(async (req, res) => {
  const { files, csvText, defaults } = req.body;
  await Promise.all(
    files.map((file) => assertUploaded(file.audioKey, staffOwner(req), "audio", "files"))
  );
  const bulk = await bulkImportService.startBulkImport(req.staff.userId, {
    files,
    csvText,
    defaults,
  });
  req.audit({
    action: "track.bulk_upload",
    targetType: "bulkImport",
    targetId: bulk._id,
    after: { files: files.length },
  });
  return sendSuccess(res, {
    statusCode: 202,
    message: "Bulk upload started",
    data: { bulkImportId: String(bulk._id) },
  });
});

/** GET /api/admin/tracks/bulk/:id — bulk upload progress and per-row results */
export const getBulkUpload = asyncHandler(async (req, res) => {
  const bulk = await bulkImportService.getBulkImport(req.params.id);
  return sendSuccess(res, {
    message: "Bulk upload fetched",
    data: {
      bulk: {
        id: String(bulk._id),
        status: bulk.status,
        total: bulk.files.length,
        results: bulk.results,
        error: bulk.error,
        createdAt: bulk.createdAt,
        finishedAt: bulk.finishedAt,
      },
    },
  });
});
