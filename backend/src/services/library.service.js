/**
 * Library: likes and follows (PRD LIB-1, LIB-4, roadmap Day 6).
 * - Like / unlike a published song → Liked Songs, track likeCount, taste ±5
 * - Follow / unfollow an artist → Following list, artist followersCount, taste ±4
 * Both are idempotent: liking twice or unfollowing something not followed is a no-op.
 */
import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { Follow } from "../models/follow.model.js";
import { Track } from "../models/track.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { applyArtistSignal, applyTrackSignal } from "./taste.service.js";
import { buildPageMeta, getPagination } from "../helpers/genericFunctions.js";
import { ERROR_CODES, LIBRARY_IDS_MAX, TASTE_SIGNALS } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified";
const DUPLICATE_KEY = 11000;

/**
 * A published track, or 404.
 * @param {string} trackId
 * @returns {Promise<Object>}
 */
async function getPublishedTrackOrThrow(trackId) {
  const track = mongoose.isValidObjectId(trackId)
    ? await Track.findOne({ _id: trackId, status: "published" })
        .select("genres vibes mood artistId")
        .lean()
    : null;
  if (!track) throw ApiError.notFound("This song isn't available", { code: ERROR_CODES.NOT_FOUND });
  return track;
}

/**
 * Insert a document; true when new, false when it already existed.
 * @param {mongoose.Model} Model
 * @param {Object} doc
 * @returns {Promise<boolean>}
 */
async function createOnce(Model, doc) {
  try {
    await Model.create(doc);
    return true;
  } catch (error) {
    if (error.code === DUPLICATE_KEY) return false;
    throw error;
  }
}

/* ===== Likes (LIB-1) ===== */

/**
 * @param {string} userId
 * @param {string} trackId
 * @returns {Promise<{ liked: true, likeCount: number }>}
 */
export async function likeTrack(userId, trackId) {
  const track = await getPublishedTrackOrThrow(trackId);
  const isNew = await createOnce(Like, { userId, trackId });
  if (isNew) {
    await Track.updateOne({ _id: trackId }, { $inc: { likeCount: 1 } });
    await applyTrackSignal(userId, track, TASTE_SIGNALS.like, "like");
  }
  const { likeCount } = await Track.findById(trackId).select("likeCount").lean();
  return { liked: true, likeCount };
}

/**
 * @param {string} userId
 * @param {string} trackId
 * @returns {Promise<{ liked: false, likeCount: number }>}
 */
export async function unlikeTrack(userId, trackId) {
  if (!mongoose.isValidObjectId(trackId)) throw ApiError.notFound("This song isn't available");
  const { deletedCount } = await Like.deleteOne({ userId, trackId });
  const track = await Track.findById(trackId).select("genres vibes mood artistId likeCount").lean();
  if (deletedCount && track) {
    await Track.updateOne({ _id: trackId, likeCount: { $gt: 0 } }, { $inc: { likeCount: -1 } });
    await applyTrackSignal(userId, track, TASTE_SIGNALS.unlike, "unlike");
  }
  return { liked: false, likeCount: Math.max(0, (track?.likeCount ?? 1) - (deletedCount ? 1 : 0)) };
}

/**
 * Liked Songs, newest first (only songs still published).
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} query
 * @returns {Promise<{ items: Array<{ likedAt: Date, track: Object }>, meta: Object }>}
 */
export async function listLikedTracks(userId, query) {
  const { page, limit, skip } = getPagination(query);
  // One query: join each like to its track, keep published songs, then page
  const [result] = await Like.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
    { $sort: { createdAt: -1 } },
    { $lookup: { from: "tracks", localField: "trackId", foreignField: "_id", as: "track" } },
    { $unwind: "$track" },
    { $match: { "track.status": "published" } },
    { $facet: { items: [{ $skip: skip }, { $limit: limit }], total: [{ $count: "count" }] } },
  ]);
  const tracks = await Track.populate(
    result.items.map((item) => item.track),
    { path: "artistId", select: ARTIST_REF_FIELDS }
  );
  return {
    items: result.items.map((item, index) => ({ likedAt: item.createdAt, track: tracks[index] })),
    meta: buildPageMeta(result.total[0]?.count ?? 0, page, limit),
  };
}

/**
 * Every liked track id (for heart icons across the app).
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function listLikedTrackIds(userId) {
  const likes = await Like.find({ userId })
    .sort({ createdAt: -1 })
    .limit(LIBRARY_IDS_MAX)
    .select("trackId")
    .lean();
  return likes.map((like) => String(like.trackId));
}

/* ===== Follows (LIB-4) ===== */

/**
 * @param {string} artistId
 * @returns {Promise<Object>}
 */
async function getArtistOrThrow(artistId) {
  const artist = mongoose.isValidObjectId(artistId)
    ? await ArtistProfile.findById(artistId).select("userId followersCount").lean()
    : null;
  if (!artist) throw ApiError.notFound("Artist not found", { code: ERROR_CODES.NOT_FOUND });
  return artist;
}

/**
 * @param {string} userId
 * @param {string} artistId
 * @returns {Promise<{ following: true, followersCount: number }>}
 * @throws {ApiError} 400 when following your own artist profile
 */
export async function followArtist(userId, artistId) {
  const artist = await getArtistOrThrow(artistId);
  if (artist.userId && String(artist.userId) === String(userId)) {
    throw ApiError.badRequest("You can't follow your own artist page");
  }
  const isNew = await createOnce(Follow, { userId, artistId });
  if (isNew) {
    await ArtistProfile.updateOne({ _id: artistId }, { $inc: { followersCount: 1 } });
    await applyArtistSignal(userId, artistId, TASTE_SIGNALS.follow, "follow");
  }
  const { followersCount } = await ArtistProfile.findById(artistId).select("followersCount").lean();
  return { following: true, followersCount };
}

/**
 * @param {string} userId
 * @param {string} artistId
 * @returns {Promise<{ following: false, followersCount: number }>}
 */
export async function unfollowArtist(userId, artistId) {
  const artist = await getArtistOrThrow(artistId);
  const { deletedCount } = await Follow.deleteOne({ userId, artistId });
  if (deletedCount) {
    await ArtistProfile.updateOne(
      { _id: artistId, followersCount: { $gt: 0 } },
      { $inc: { followersCount: -1 } }
    );
    await applyArtistSignal(userId, artistId, TASTE_SIGNALS.unfollow, "unfollow");
  }
  return {
    following: false,
    followersCount: Math.max(0, artist.followersCount - (deletedCount ? 1 : 0)),
  };
}

/**
 * Artists the user follows, most recent first.
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} query
 * @returns {Promise<{ items: Array<{ followedAt: Date, artist: Object }>, meta: Object }>}
 */
export async function listFollowedArtists(userId, query) {
  const { page, limit, skip } = getPagination(query);
  const [follows, total] = await Promise.all([
    Follow.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("artistId")
      .lean(),
    Follow.countDocuments({ userId }),
  ]);
  return {
    items: follows
      .filter((follow) => follow.artistId)
      .map((follow) => ({ followedAt: follow.createdAt, artist: follow.artistId })),
    meta: buildPageMeta(total, page, limit),
  };
}

/**
 * Every followed artist id (for Follow buttons).
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function listFollowedArtistIds(userId) {
  const follows = await Follow.find({ userId }).limit(LIBRARY_IDS_MAX).select("artistId").lean();
  return follows.map((follow) => String(follow.artistId));
}
