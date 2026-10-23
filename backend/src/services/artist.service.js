/**
 * Artist profiles: public artist pages (PRD F21) and the admin "Artists"
 * manager (PRD MUS-4, F37) — official artists created by staff, verification.
 */
import mongoose from "mongoose";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { Track } from "../models/track.model.js";
import { Album } from "../models/album.model.js";
import { ERROR_CODES } from "../config/constants.js";
import { buildPageMeta, getPagination, slugify } from "../helpers/genericFunctions.js";
import { ApiError } from "../utils/ApiError.js";

/** @returns {ApiError} */
const artistNotFound = (id) =>
  ApiError.notFound(`Artist not found: ${id}`, { code: ERROR_CODES.NOT_FOUND });

/**
 * A slug for a new artist that no one else has ("arijit-singh", then "arijit-singh-2"…).
 * @param {string} stageName
 * @returns {Promise<string>}
 */
export async function generateUniqueArtistSlug(stageName) {
  const base = slugify(stageName) || "artist";
  for (let attempt = 1; attempt < 50; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    if (!(await ArtistProfile.exists({ slug: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Find an artist by id or slug.
 * @param {string} idOrSlug
 * @returns {Promise<Object>}
 * @throws {ApiError} 404
 */
export async function getArtistOrThrow(idOrSlug) {
  const where = mongoose.isValidObjectId(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: String(idOrSlug).toLowerCase() };
  const artist = await ArtistProfile.findOne(where);
  if (!artist) throw artistNotFound(idOrSlug);
  return artist;
}

/**
 * Public artist page: profile, published tracks (most played first) and albums.
 * @param {string} idOrSlug
 * @returns {Promise<{ artist: Object, tracks: Object[], albums: Object[] }>}
 */
export async function getPublicArtistPage(idOrSlug) {
  const artist = await getArtistOrThrow(idOrSlug);
  const [tracks, albums] = await Promise.all([
    Track.find({ artistId: artist._id, status: "published" })
      .sort({ playCount: -1, publishedAt: -1 })
      .limit(100)
      .populate("artistId", "stageName slug avatar verified"),
    Album.find({ artistId: artist._id }).sort({ releaseDate: -1, createdAt: -1 }),
  ]);
  return { artist, tracks, albums };
}

/**
 * Find an artist by (case-insensitive) name or slug — used by bulk upload.
 * @param {string} name
 * @returns {Promise<Object|null>}
 */
export async function findArtistByName(name) {
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  return ArtistProfile.findOne({
    $or: [
      { slug: slugify(trimmed) },
      {
        stageName: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      },
    ],
  });
}

/**
 * Admin list with search and track counts.
 * @param {{ q?: string, official?: boolean }} filters
 * @param {Object} query - pagination
 * @returns {Promise<{ items: Array<{ artist: Object, trackCount: number }>, meta: Object }>}
 */
export async function listArtists(filters, query) {
  const { page, limit, skip } = getPagination(query);
  const where = {};
  if (filters.q)
    where.stageName = {
      $regex: String(filters.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  if (filters.official === true) where.userId = null;

  const [artists, total] = await Promise.all([
    ArtistProfile.find(where).sort({ popularity: -1, stageName: 1 }).skip(skip).limit(limit),
    ArtistProfile.countDocuments(where),
  ]);
  const counts = await Track.aggregate([
    { $match: { artistId: { $in: artists.map((artist) => artist._id) } } },
    { $group: { _id: "$artistId", count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((entry) => [String(entry._id), entry.count]));
  return {
    items: artists.map((artist) => ({
      artist,
      trackCount: countById.get(String(artist._id)) ?? 0,
    })),
    meta: buildPageMeta(total, page, limit),
  };
}

/**
 * Create an official artist (no user account) — PRD MUS-4.
 * @param {Object} input - stageName, bio, country, genres, vibes, verified, socials
 * @param {string} staffId
 * @returns {Promise<Object>}
 */
export async function createOfficialArtist(input, staffId) {
  return ArtistProfile.create({
    ...input,
    slug: await generateUniqueArtistSlug(input.stageName),
    userId: null,
    createdByStaff: staffId,
  });
}

/**
 * Update an artist's profile fields.
 * @param {string} artistId
 * @param {Object} changes
 * @returns {Promise<{ artist: Object, before: Object }>}
 */
export async function updateArtist(artistId, changes) {
  const artist = await getArtistOrThrow(artistId);
  const before = artist.toObject();
  Object.assign(artist, changes);
  await artist.save();
  return { artist, before };
}

/**
 * Delete an official artist that has no tracks (creator profiles are never deleted here).
 * @param {string} artistId
 * @returns {Promise<Object>} The deleted artist
 * @throws {ApiError} 409 when the artist still has tracks or belongs to a creator
 */
export async function deleteArtist(artistId) {
  const artist = await getArtistOrThrow(artistId);
  if (artist.userId) {
    throw ApiError.conflict("Creator profiles can't be deleted here", {
      code: ERROR_CODES.INVALID_STATE,
    });
  }
  if (await Track.exists({ artistId: artist._id })) {
    throw ApiError.conflict("Move or delete this artist's tracks first", {
      code: ERROR_CODES.INVALID_STATE,
    });
  }
  await Album.deleteMany({ artistId: artist._id });
  await ArtistProfile.deleteOne({ _id: artist._id });
  return artist;
}
