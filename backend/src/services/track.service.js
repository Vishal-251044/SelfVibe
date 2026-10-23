/**
 * Track lifecycle shared by creators, the admin music manager, bulk upload and
 * the catalog import: create (→ processing job), edit, release, delete,
 * reprocess, list, and signed streaming URLs (PRD §10.6, §10.9.3, PLY-4).
 */
import mongoose from "mongoose";
import { Track } from "../models/track.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { Album } from "../models/album.model.js";
import { Genre } from "../models/genre.model.js";
import { Vibe } from "../models/vibe.model.js";
import { storage } from "./storage/index.js";
import { queue } from "./queue/index.js";
import { env } from "../config/env.js";
import { ERROR_CODES, JOBS, UPLOAD_LIMITS } from "../config/constants.js";
import { recordStorageUsage } from "./storagePool.service.js";
import { PROCESS_TRACK_MAX_ATTEMPTS } from "./trackProcessing.service.js";
import { getPagination, buildPageMeta } from "../helpers/genericFunctions.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified";
const PAID_PLANS = ["premium", "creatorPro"];

/** @returns {ApiError} 404 for a missing track */
const trackNotFound = (id) =>
  ApiError.notFound(`Track not found: ${id}`, { code: ERROR_CODES.NOT_FOUND });

/**
 * Throw 400 unless every genre / vibe slug exists and is active.
 * @param {{ genres?: string[], vibes?: string[] }} tags
 * @returns {Promise<void>}
 */
export async function assertTagsExist({ genres = [], vibes = [] }) {
  const [genreCount, vibeCount] = await Promise.all([
    genres.length ? Genre.countDocuments({ slug: { $in: genres }, active: true }) : 0,
    vibes.length ? Vibe.countDocuments({ slug: { $in: vibes }, active: true }) : 0,
  ]);
  const fields = {};
  if (genreCount !== new Set(genres).size) fields.genres = "Unknown genre";
  if (vibeCount !== new Set(vibes).size) fields.vibes = "Unknown vibe";
  if (Object.keys(fields).length) {
    throw ApiError.badRequest("Some genres or vibes don't exist", {
      code: ERROR_CODES.UNKNOWN_TASTE_OPTION,
      fields,
    });
  }
}

/**
 * Queue (re)processing for a track.
 * @param {string} trackId
 * @returns {Promise<void>}
 */
export async function enqueueProcessing(trackId) {
  await queue.enqueue(
    JOBS.processTrack,
    { trackId: String(trackId) },
    { jobId: `${JOBS.processTrack}-${trackId}-${Date.now()}`, attempts: PROCESS_TRACK_MAX_ATTEMPTS }
  );
}

/**
 * Community upload allowance for a user (PRD CRT-8): songs used, limit by plan,
 * and storage used.
 * @param {{ userId: string, plan?: string }} user
 * @returns {Promise<{ songsUsed: number, songLimit: number|null, bytesUsed: number }>}
 */
export async function getUploadUsage({ userId, plan = "free" }) {
  const [songsUsed, [bytes]] = await Promise.all([
    Track.countDocuments({ uploadedBy: userId, catalog: "community" }),
    Track.aggregate([
      { $match: { uploadedBy: new mongoose.Types.ObjectId(String(userId)), catalog: "community" } },
      { $group: { _id: null, total: { $sum: "$storage.bytes" } } },
    ]),
  ]);
  const songLimit = Object.hasOwn(UPLOAD_LIMITS, plan) ? UPLOAD_LIMITS[plan] : UPLOAD_LIMITS.free;
  return { songsUsed, songLimit, bytesUsed: bytes?.total ?? 0 };
}

/**
 * Throw when a user has used up their community uploads.
 * @param {{ userId: string, plan?: string }} user
 * @returns {Promise<void>}
 * @throws {ApiError} 403 UPLOAD_LIMIT_REACHED
 */
export async function assertCanUpload(user) {
  const { songsUsed, songLimit } = await getUploadUsage(user);
  if (songLimit !== null && songsUsed >= songLimit) {
    throw ApiError.forbidden(
      `You've reached your limit of ${songLimit} songs. Delete a song or upgrade to Creator Pro for unlimited uploads.`,
      { code: ERROR_CODES.UPLOAD_LIMIT_REACHED }
    );
  }
}

/**
 * Create a track in "processing" state and queue its processing job.
 * Uploaded keys must already be checked with assertUploaded().
 * @param {Object} input
 * @param {string} input.artistId
 * @param {string} input.uploadedBy - User id
 * @param {string} input.audioKey - Incoming audio key
 * @param {string|null} [input.coverKey] - Incoming cover image key
 * @param {Object} input.metadata - title, genres, vibes, mood, language, explicit, lyrics, bpm, albumId
 * @param {"creator"|"admin"} input.addedVia
 * @param {"official"|"community"} [input.catalog] - Defaults from addedVia (admin → official)
 * @param {"upload"|"import"} [input.source]
 * @param {"publish"|"schedule"|"draft"} [input.releaseIntent]
 * @param {Date|null} [input.scheduledAt]
 * @param {boolean} [input.rightsConfirmed]
 * @param {Object} [input.license]
 * @param {Object} [input.external]
 * @returns {Promise<Object>} The created track
 */
export async function createTrack(input) {
  const artist = await ArtistProfile.findById(input.artistId).select("_id");
  if (!artist)
    throw ApiError.badRequest("Choose an existing artist", {
      fields: { artistId: "Unknown artist" },
    });
  await assertTagsExist(input.metadata);
  if (input.metadata.albumId) await assertAlbumOfArtist(input.metadata.albumId, input.artistId);

  const track = await Track.create({
    ...input.metadata,
    artistId: input.artistId,
    uploadedBy: input.uploadedBy,
    audio: { sourceKey: input.audioKey },
    coverSourceKey: input.coverKey ?? null,
    addedVia: input.addedVia,
    catalog: input.catalog ?? (input.addedVia === "admin" ? "official" : "community"),
    source: input.source ?? "upload",
    releaseIntent: input.releaseIntent ?? "publish",
    scheduledAt: input.releaseIntent === "schedule" ? input.scheduledAt : null,
    rightsConfirmed: Boolean(input.rightsConfirmed),
    license: input.license ?? undefined,
    external: input.external ?? undefined,
    status: "processing",
    processing: { state: "queued" },
  });

  if (input.metadata.albumId) {
    await Album.updateOne({ _id: input.metadata.albumId }, { $addToSet: { trackIds: track._id } });
  }
  await enqueueProcessing(track._id);
  logger.debug(`[TrackService] created track ${track._id} via ${input.addedVia}`);
  return track;
}

/**
 * @param {string} albumId
 * @param {string} artistId
 * @throws {ApiError} 400 when the album is missing or belongs to another artist
 */
async function assertAlbumOfArtist(albumId, artistId) {
  const album = await Album.findById(albumId).select("artistId");
  if (!album || String(album.artistId) !== String(artistId)) {
    throw ApiError.badRequest("That album belongs to a different artist", {
      fields: { albumId: "Choose an album by this artist" },
    });
  }
}

/**
 * Load a track (with its artist) or throw 404.
 * @param {string} trackId
 * @returns {Promise<Object>}
 */
export async function getTrackOrThrow(trackId) {
  if (!mongoose.isValidObjectId(trackId)) throw trackNotFound(trackId);
  const track = await Track.findById(trackId).populate("artistId", ARTIST_REF_FIELDS);
  if (!track) throw trackNotFound(trackId);
  return track;
}

/**
 * A published track for listeners (404 for anything not published).
 * @param {string} trackId
 * @returns {Promise<Object>}
 */
export async function getPublishedTrack(trackId) {
  const track = await getTrackOrThrow(trackId);
  if (track.status !== "published") throw trackNotFound(trackId);
  return track;
}

/**
 * Edit metadata (and optionally the cover). Returns before/after for the audit log.
 * @param {string} trackId
 * @param {Object} changes - Validated fields
 * @param {{ coverKey?: string|null }} [files]
 * @returns {Promise<{ track: Object, before: Object }>}
 */
export async function updateTrack(trackId, changes, { coverKey } = {}) {
  const track = await getTrackOrThrow(trackId);
  const before = track.toObject();
  await assertTagsExist(changes);
  const artistId = changes.artistId ?? String(track.artistId._id);
  if (changes.artistId) {
    const exists = await ArtistProfile.exists({ _id: changes.artistId });
    if (!exists)
      throw ApiError.badRequest("Choose an existing artist", {
        fields: { artistId: "Unknown artist" },
      });
  }
  if (changes.albumId) await assertAlbumOfArtist(changes.albumId, artistId);

  // Keep album membership in sync
  if (changes.albumId !== undefined && String(changes.albumId) !== String(track.albumId)) {
    if (track.albumId)
      await Album.updateOne({ _id: track.albumId }, { $pull: { trackIds: track._id } });
    if (changes.albumId)
      await Album.updateOne({ _id: changes.albumId }, { $addToSet: { trackIds: track._id } });
  }

  Object.assign(track, changes);
  if (coverKey) {
    track.coverSourceKey = coverKey;
    track.processing = { state: "queued", error: null, attempts: 0 };
  }
  await track.save();
  if (coverKey) await enqueueProcessing(track._id); // re-renders the cover only if needed
  return { track: await getTrackOrThrow(trackId), before };
}

/**
 * Publish now, unpublish, or schedule a release.
 * @param {string} trackId
 * @param {"publish"|"unpublish"|"schedule"} action
 * @param {Date} [scheduledAt]
 * @returns {Promise<{ track: Object, before: Object }>}
 * @throws {ApiError} 409 when the track is not processed yet or was taken down
 */
export async function changeRelease(trackId, action, scheduledAt) {
  const track = await getTrackOrThrow(trackId);
  const before = { status: track.status, scheduledAt: track.scheduledAt };

  if (track.status === "taken_down") {
    throw ApiError.conflict("This track was taken down by moderation", {
      code: ERROR_CODES.INVALID_STATE,
    });
  }
  const isProcessed = track.processing?.state === "done";

  if (action === "publish") {
    if (!isProcessed) {
      // Not ready yet: publish automatically when processing finishes
      track.releaseIntent = "publish";
    } else {
      track.status = "published";
      track.publishedAt ??= new Date();
    }
    track.scheduledAt = null;
  } else if (action === "unpublish") {
    track.releaseIntent = "draft";
    track.scheduledAt = null;
    if (isProcessed) track.status = "unpublished";
  } else if (action === "schedule") {
    track.releaseIntent = "schedule";
    track.scheduledAt = scheduledAt;
    if (isProcessed) track.status = "scheduled";
  }

  await track.save();
  return { track, before };
}

/**
 * Re-run processing (e.g. after a failure, or with a replaced audio file).
 * @param {string} trackId
 * @param {string|null} [newAudioKey] - Replacement audio (already checked)
 * @returns {Promise<Object>} The track
 */
export async function reprocessTrack(trackId, newAudioKey = null) {
  const track = await getTrackOrThrow(trackId);
  if (newAudioKey) {
    await storage.remove([track.audio.sourceKey]);
    track.audio.sourceKey = newAudioKey;
  }
  track.processing = { state: "queued", error: null, attempts: 0 };
  await track.save();
  await enqueueProcessing(track._id);
  return track;
}

/**
 * Delete a track and every stored file behind it.
 * @param {string} trackId
 * @returns {Promise<Object>} The deleted track (for the audit log)
 */
export async function deleteTrack(trackId) {
  const track = await getTrackOrThrow(trackId);
  await Track.deleteOne({ _id: track._id });
  if (track.albumId)
    await Album.updateOne({ _id: track.albumId }, { $pull: { trackIds: track._id } });
  await storage
    .remove([
      track.audio.sourceKey,
      ...track.audio.formats.map((format) => format.key),
      track.coverKey,
      track.coverSourceKey,
    ])
    .catch((error) =>
      logger.warn(`[TrackService] cleanup for deleted track ${trackId} failed: ${error.message}`)
    );
  if (track.storage?.bytes) {
    await recordStorageUsage(track.storage.accountKey, { bytes: -track.storage.bytes, songs: -1 });
  }
  return track;
}

/**
 * List tracks with filters (admin music manager, creator's own tracks).
 * @param {Object} filters - { q, status, genre, artistId, uploadedBy, addedVia, processing }
 * @param {Object} query - { page, limit }
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function listTracks(filters, query) {
  const { page, limit, skip } = getPagination(query);
  const where = {};
  if (filters.q) where.title = { $regex: escapeRegex(filters.q), $options: "i" };
  if (filters.status) where.status = filters.status;
  if (filters.genre) where.genres = filters.genre;
  if (filters.artistId) where.artistId = filters.artistId;
  if (filters.uploadedBy) where.uploadedBy = filters.uploadedBy;
  if (filters.addedVia) where.addedVia = filters.addedVia;
  if (filters.processing) where["processing.state"] = filters.processing;
  if (filters.catalog) where.catalog = filters.catalog;

  const [items, total] = await Promise.all([
    Track.find(where)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("artistId", ARTIST_REF_FIELDS),
    Track.countDocuments(where),
  ]);
  return { items, meta: buildPageMeta(total, page, limit) };
}

/**
 * Escape user input for use inside a RegExp.
 * @param {string} text
 * @returns {string}
 */
function escapeRegex(text) {
  return String(text)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .slice(0, 100);
}

/**
 * Signed, expiring stream URL (PLY-4). Free listeners get 128 kbps; paid
 * plans get 320 kbps when available. Unpublished tracks only for their
 * uploader (or staff via the admin route).
 * @param {string} trackId
 * @param {{ userId: string, plan?: string, isStaff?: boolean }} viewer
 * @param {{ quality?: "standard"|"high" }} [options]
 * @returns {Promise<{ url: string, expiresAt: Date, bitrateKbps: number, durationSec: number }>}
 */
export async function getStreamUrl(trackId, viewer, { quality } = {}) {
  const track = await getTrackOrThrow(trackId);
  const isOwner = String(track.uploadedBy) === String(viewer.userId);
  if (track.status !== "published" && !isOwner && !viewer.isStaff) throw trackNotFound(trackId);
  // A published track being re-processed keeps streaming its current files
  if (track.audio.formats.length === 0) {
    throw ApiError.conflict("This track is still processing", {
      code: ERROR_CODES.TRACK_NOT_READY,
    });
  }

  const formats = [...track.audio.formats].sort((a, b) => a.bitrateKbps - b.bitrateKbps);
  const wantsHigh =
    quality === "high" || (quality !== "standard" && PAID_PLANS.includes(viewer.plan));
  const canHaveHigh = PAID_PLANS.includes(viewer.plan) || viewer.isStaff || isOwner;
  const format = wantsHigh && canHaveHigh ? formats.at(-1) : formats[0];

  const ttlSeconds = env.storage.streamUrlTtlSeconds;
  return {
    url: await storage.createDownloadUrl(format.key, { ttlSeconds }),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    bitrateKbps: format.bitrateKbps,
    durationSec: track.audio.durationSec,
  };
}
