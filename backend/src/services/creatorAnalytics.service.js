/**
 * Creator analytics (PRD CRT-7, PRF-4, roadmap Day 9 GET /creator/analytics):
 * the same numbers staff see, for the creator's own songs only — plays,
 * unique listeners, likes, saves, comments, completion, top tracks and plays
 * over time. Never exposes who the listeners are.
 * Also: asking for the verified badge (reviewed by staff in the console).
 */
import { ArtistProfile } from "../models/artistProfile.model.js";
import { Track } from "../models/track.model.js";
import {
  countUniqueListeners,
  dailySeries,
  rawStatsByTrack,
  summariseStats,
} from "./stats/trackStats.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../config/constants.js";
import { logger } from "../utils/logger.js";

const TOP_TRACKS = 10;

/**
 * The creator's artist profile, or 404.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function requireOwnArtist(userId) {
  const artist = await ArtistProfile.findOne({ userId });
  if (!artist)
    throw ApiError.notFound("Set up your creator profile first", { code: ERROR_CODES.NOT_FOUND });
  return artist;
}

/**
 * Analytics for the signed-in creator.
 * @param {string} userId
 * @param {{ rangeDays: number }} options
 * @returns {Promise<Object>}
 */
export async function getCreatorAnalytics(userId, { rangeDays }) {
  const artist = await requireOwnArtist(userId);
  const tracks = await Track.find({
    artistId: artist._id,
    status: { $in: ["published", "unpublished", "scheduled"] },
  })
    .select("title coverUrl status playCount likeCount publishedAt catalog")
    .lean();
  const ids = tracks.map((track) => track._id);
  if (ids.length === 0) {
    return {
      rangeDays,
      totals: summariseStats([]),
      listeners: 0,
      followers: artist.followersCount ?? 0,
      series: [],
      sources: {},
      topTracks: [],
      songCount: 0,
    };
  }
  const [raw, listeners, { series, sources }] = await Promise.all([
    rawStatsByTrack({ rangeDays, trackIds: ids }),
    countUniqueListeners({ trackIds: ids, rangeDays }),
    dailySeries({ trackIds: ids, rangeDays }),
  ]);
  const totals = summariseStats([...raw.values()]);
  const topTracks = tracks
    .map((track) => {
      const stats = raw.has(String(track._id))
        ? summariseStats([raw.get(String(track._id))])
        : summariseStats([]);
      return {
        id: String(track._id),
        title: track.title,
        coverUrl: track.coverUrl ?? null,
        status: track.status,
        plays: stats.plays,
        likes: stats.likes,
        saves: stats.saves,
        comments: stats.comments,
        completionRate: stats.completionRate,
        skipRate: stats.skipRate,
        totalPlays: track.playCount ?? 0,
      };
    })
    .sort((a, b) => b.plays - a.plays || b.totalPlays - a.totalPlays)
    .slice(0, TOP_TRACKS);

  return {
    rangeDays,
    totals: { ...totals, listeners }, // exact distinct listeners, no identities
    followers: artist.followersCount ?? 0,
    songCount: tracks.length,
    series: series.map(({ date, plays, listeners: dayListeners, likes }) => ({
      date,
      plays,
      listeners: dayListeners,
      likes,
    })),
    sources,
    topTracks,
  };
}

/**
 * Ask for the verified badge (once at a time; needs a published song).
 * @param {string} userId
 * @param {{ note?: string }} input
 * @returns {Promise<{ status: string, requestedAt: Date }>}
 * @throws {ApiError} 400 / 409
 */
export async function requestVerification(userId, { note = "" }) {
  const artist = await requireOwnArtist(userId);
  if (artist.verified) throw ApiError.conflict("Your profile is already verified");
  if (artist.verification?.status === "pending")
    throw ApiError.conflict("Your request is already being reviewed");
  const hasSong = await Track.exists({ artistId: artist._id, status: "published" });
  if (!hasSong)
    throw ApiError.badRequest("Publish at least one song before asking for verification");
  artist.verification = {
    status: "pending",
    note,
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
  };
  await artist.save();
  logger.info(`[Creator] verification requested artistId=${artist._id}`);
  return { status: "pending", requestedAt: artist.verification.requestedAt };
}
