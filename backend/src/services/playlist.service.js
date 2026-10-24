/**
 * Playlists (PRD LIB-2, roadmap Day 6): create, rename, description, cover,
 * public / private, add / remove / reorder tracks. Only the owner can change a
 * playlist; anyone can open a public one. Adding a song is a taste signal (+4).
 */
import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Track } from "../models/track.model.js";
import { applyTrackSignal } from "./taste.service.js";
import { processCoverUpload } from "./mediaUpload.service.js";
import {
  ERROR_CODES,
  PLAYLIST_MAX_TRACKS,
  PLAYLISTS_PER_USER_MAX,
  TASTE_SIGNALS,
} from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { storage } from "./storage/index.js";
import { logger } from "../utils/logger.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified";
const MOSAIC_COVERS = 4;

/** @returns {ApiError} */
const playlistNotFound = () =>
  ApiError.notFound("Playlist not found", { code: ERROR_CODES.NOT_FOUND });

/**
 * A playlist the user owns, or 404 (other people's playlists are never revealed).
 * @param {string} playlistId
 * @param {string} userId
 * @returns {Promise<Object>} Mongoose document
 */
async function getOwnedPlaylist(playlistId, userId) {
  if (!mongoose.isValidObjectId(playlistId)) throw playlistNotFound();
  const playlist = await Playlist.findOne({ _id: playlistId, ownerId: userId, type: "user" });
  if (!playlist) throw playlistNotFound();
  return playlist;
}

/**
 * Cover images for playlist cards: the uploaded cover, else up to four
 * covers from the first songs (a mosaic).
 * @param {Object[]} playlists - Lean playlists
 * @returns {Promise<Map<string, string[]>>} playlistId → cover URLs
 */
export async function mosaicCovers(playlists) {
  const firstIds = playlists.flatMap((playlist) =>
    playlist.coverUrl ? [] : playlist.tracks.slice(0, 12).map((entry) => entry.trackId)
  );
  const tracks = firstIds.length
    ? await Track.find({ _id: { $in: firstIds }, status: "published", coverUrl: { $ne: null } })
        .select("coverUrl")
        .lean()
    : [];
  const coverById = new Map(tracks.map((track) => [String(track._id), track.coverUrl]));
  return new Map(
    playlists.map((playlist) => {
      if (playlist.coverUrl) return [String(playlist._id), [playlist.coverUrl]];
      const covers = [
        ...new Set(
          playlist.tracks.map((entry) => coverById.get(String(entry.trackId))).filter(Boolean)
        ),
      ];
      return [String(playlist._id), covers.slice(0, MOSAIC_COVERS)];
    })
  );
}

/**
 * My playlists, recently changed first, with cover images.
 * @param {string} userId
 * @returns {Promise<Array<{ playlist: Object, covers: string[] }>>}
 */
export async function listMyPlaylists(userId) {
  const playlists = await Playlist.find({ ownerId: userId, type: "user" })
    .sort({ updatedAt: -1 })
    .lean();
  const covers = await mosaicCovers(playlists);
  return playlists.map((playlist) => ({ playlist, covers: covers.get(String(playlist._id)) }));
}

/**
 * @param {string} userId
 * @param {{ name: string, description?: string, isPublic?: boolean }} input
 * @returns {Promise<Object>}
 * @throws {ApiError} 400 at the playlist limit
 */
export async function createPlaylist(userId, input) {
  const count = await Playlist.countDocuments({ ownerId: userId, type: "user" });
  if (count >= PLAYLISTS_PER_USER_MAX) {
    throw ApiError.badRequest(`You can have up to ${PLAYLISTS_PER_USER_MAX} playlists`);
  }
  return Playlist.create({ ...input, ownerId: userId, type: "user", tracks: [] });
}

/**
 * A playlist with its songs, for the owner or anyone if it is public.
 * Songs that are no longer published are hidden.
 * @param {string} playlistId
 * @param {string|null} viewerId
 * @returns {Promise<{ playlist: Object, tracks: Array<{ addedAt: Date, track: Object }>, covers: string[], isOwner: boolean }>}
 */
export async function getPlaylist(playlistId, viewerId) {
  if (!mongoose.isValidObjectId(playlistId)) throw playlistNotFound();
  const playlist = await Playlist.findById(playlistId).populate("ownerId", "name avatar").lean();
  const isOwner = Boolean(
    viewerId && playlist && String(playlist.ownerId?._id) === String(viewerId)
  );
  if (!playlist || (!playlist.isPublic && !isOwner)) throw playlistNotFound();

  const tracks = await Track.find({
    _id: { $in: playlist.tracks.map((entry) => entry.trackId) },
    status: "published",
  })
    .populate("artistId", ARTIST_REF_FIELDS)
    .lean();
  const byId = new Map(tracks.map((track) => [String(track._id), track]));
  const ordered = playlist.tracks
    .map((entry) => ({ addedAt: entry.addedAt, track: byId.get(String(entry.trackId)) }))
    .filter((entry) => entry.track);
  const covers = (await mosaicCovers([{ ...playlist, ownerId: playlist.ownerId?._id }])).get(
    String(playlist._id)
  );
  return { playlist, tracks: ordered, covers, isOwner };
}

/**
 * Rename, describe, make public / private, or change the cover.
 * @param {string} playlistId
 * @param {string} userId
 * @param {{ name?: string, description?: string, isPublic?: boolean, coverKey?: string|null }} changes
 *   coverKey null removes the uploaded cover (back to the song mosaic)
 * @returns {Promise<Object>}
 */
export async function updatePlaylist(playlistId, userId, { coverKey, ...changes }) {
  const playlist = await getOwnedPlaylist(playlistId, userId);
  const oldCoverKey = playlist.coverKey;
  Object.assign(playlist, changes);
  if (coverKey) {
    const cover = await processCoverUpload(coverKey, "playlists", String(playlist._id));
    playlist.coverUrl = cover.url;
    playlist.coverKey = cover.key;
  } else if (coverKey === null) {
    playlist.coverUrl = null;
    playlist.coverKey = null;
  }
  await playlist.save();
  if (oldCoverKey && oldCoverKey !== playlist.coverKey) {
    storage
      .remove([oldCoverKey])
      .catch((error) =>
        logger.warn(`[PlaylistService] old cover cleanup failed: ${error.message}`)
      );
  }
  return playlist;
}

/**
 * @param {string} playlistId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deletePlaylist(playlistId, userId) {
  const playlist = await getOwnedPlaylist(playlistId, userId);
  await playlist.deleteOne();
  if (playlist.coverKey) {
    storage.remove([playlist.coverKey]).catch(() => {});
  }
}

/**
 * Add songs to the end (songs already in the playlist are skipped).
 * @param {string} playlistId
 * @param {string} userId
 * @param {string[]} trackIds
 * @returns {Promise<{ playlist: Object, added: number }>}
 * @throws {ApiError} 400 when a song isn't available or the playlist is full
 */
export async function addTracks(playlistId, userId, trackIds) {
  const playlist = await getOwnedPlaylist(playlistId, userId);
  const existing = new Set(playlist.tracks.map((entry) => String(entry.trackId)));
  const wanted = [...new Set(trackIds)].filter((id) => !existing.has(id));
  const tracks = await Track.find({ _id: { $in: wanted }, status: "published" })
    .select("genres vibes mood artistId")
    .lean();
  if (tracks.length !== wanted.length) {
    throw ApiError.badRequest("Some songs aren't available any more");
  }
  if (playlist.tracks.length + tracks.length > PLAYLIST_MAX_TRACKS) {
    throw ApiError.badRequest(`A playlist can hold up to ${PLAYLIST_MAX_TRACKS} songs`);
  }
  const byId = new Map(tracks.map((track) => [String(track._id), track]));
  wanted.forEach((id) => playlist.tracks.push({ trackId: id, addedAt: new Date() }));
  await playlist.save();
  await Promise.all(
    wanted.map((id) =>
      applyTrackSignal(userId, byId.get(id), TASTE_SIGNALS.playlistAdd, "playlist add")
    )
  );
  return { playlist, added: wanted.length };
}

/**
 * @param {string} playlistId
 * @param {string} userId
 * @param {string} trackId
 * @returns {Promise<Object>}
 */
export async function removeTrack(playlistId, userId, trackId) {
  const playlist = await getOwnedPlaylist(playlistId, userId);
  playlist.tracks = playlist.tracks.filter((entry) => String(entry.trackId) !== trackId);
  await playlist.save();
  return playlist;
}

/**
 * New song order. The list must contain exactly the playlist's songs.
 * @param {string} playlistId
 * @param {string} userId
 * @param {string[]} trackIds - In the new order
 * @returns {Promise<Object>}
 * @throws {ApiError} 400 when the list doesn't match the playlist
 */
export async function reorderTracks(playlistId, userId, trackIds) {
  const playlist = await getOwnedPlaylist(playlistId, userId);
  const current = playlist.tracks.map((entry) => String(entry.trackId));
  const isSameSet =
    trackIds.length === current.length &&
    new Set(trackIds).size === trackIds.length &&
    trackIds.every((id) => current.includes(id));
  if (!isSameSet) {
    throw ApiError.badRequest("The playlist changed — refresh and try again", {
      code: ERROR_CODES.INVALID_STATE,
    });
  }
  const addedAt = new Map(playlist.tracks.map((entry) => [String(entry.trackId), entry.addedAt]));
  playlist.tracks = trackIds.map((id) => ({ trackId: id, addedAt: addedAt.get(id) }));
  await playlist.save();
  return playlist;
}
