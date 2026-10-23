/**
 * Albums / EPs / singles (PRD F23, F37): create, edit, track order, delete.
 * Track order is the order of album.trackIds; tracks point back via albumId.
 */
import mongoose from "mongoose";
import { Album } from "../models/album.model.js";
import { Track } from "../models/track.model.js";
import { getArtistOrThrow } from "./artist.service.js";
import { ERROR_CODES } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * @param {string} albumId
 * @returns {Promise<Object>}
 * @throws {ApiError} 404
 */
export async function getAlbumOrThrow(albumId) {
  const album = mongoose.isValidObjectId(albumId) ? await Album.findById(albumId) : null;
  if (!album)
    throw ApiError.notFound(`Album not found: ${albumId}`, { code: ERROR_CODES.NOT_FOUND });
  return album;
}

/**
 * Albums of one artist, newest first.
 * @param {string} artistId
 * @returns {Promise<Object[]>}
 */
export async function listAlbumsForArtist(artistId) {
  return Album.find({ artistId }).sort({ releaseDate: -1, createdAt: -1 });
}

/**
 * Album with its tracks in order (for the track-order editor).
 * @param {string} albumId
 * @returns {Promise<{ album: Object, tracks: Object[] }>}
 */
export async function getAlbumWithTracks(albumId) {
  const album = await getAlbumOrThrow(albumId);
  const tracks = await Track.find({ _id: { $in: album.trackIds } }).populate(
    "artistId",
    "stageName slug avatar verified"
  );
  const byId = new Map(tracks.map((track) => [String(track._id), track]));
  return { album, tracks: album.trackIds.map((id) => byId.get(String(id))).filter(Boolean) };
}

/**
 * @param {Object} input - artistId, title, type, releaseDate, coverUrl
 * @param {string} staffId
 * @returns {Promise<Object>}
 */
export async function createAlbum(input, staffId) {
  await getArtistOrThrow(input.artistId);
  return Album.create({ ...input, createdByStaff: staffId });
}

/**
 * @param {string} albumId
 * @param {Object} changes - title, type, releaseDate, coverUrl
 * @returns {Promise<{ album: Object, before: Object }>}
 */
export async function updateAlbum(albumId, changes) {
  const album = await getAlbumOrThrow(albumId);
  const before = album.toObject();
  Object.assign(album, changes);
  await album.save();
  return { album, before };
}

/**
 * Set which tracks are on the album and in what order.
 * Tracks must belong to the album's artist.
 * @param {string} albumId
 * @param {string[]} trackIds - In play order
 * @returns {Promise<{ album: Object, before: Object }>}
 * @throws {ApiError} 400 when a track is missing or by another artist
 */
export async function setAlbumTracks(albumId, trackIds) {
  const album = await getAlbumOrThrow(albumId);
  const before = { trackIds: album.trackIds.map(String) };
  const uniqueIds = [...new Set(trackIds.map(String))];

  const tracks = await Track.find({ _id: { $in: uniqueIds } }).select("artistId albumId");
  if (
    tracks.length !== uniqueIds.length ||
    tracks.some((track) => String(track.artistId) !== String(album.artistId))
  ) {
    throw ApiError.badRequest("Every track must exist and belong to this album's artist", {
      fields: { trackIds: "Invalid track list" },
    });
  }

  // Tracks removed from the album lose their albumId; added tracks leave their old album
  const removed = album.trackIds.map(String).filter((id) => !uniqueIds.includes(id));
  await Track.updateMany({ _id: { $in: removed } }, { $set: { albumId: null } });
  const movedFrom = tracks.filter(
    (track) => track.albumId && String(track.albumId) !== String(album._id)
  );
  for (const track of movedFrom) {
    await Album.updateOne({ _id: track.albumId }, { $pull: { trackIds: track._id } });
  }
  await Track.updateMany({ _id: { $in: uniqueIds } }, { $set: { albumId: album._id } });

  album.trackIds = uniqueIds;
  await album.save();
  return { album, before };
}

/**
 * Delete an album (its tracks stay, without an album).
 * @param {string} albumId
 * @returns {Promise<Object>}
 */
export async function deleteAlbum(albumId) {
  const album = await getAlbumOrThrow(albumId);
  await Track.updateMany({ albumId: album._id }, { $set: { albumId: null } });
  await Album.deleteOne({ _id: album._id });
  return album;
}
