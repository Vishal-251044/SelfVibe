/**
 * "Listeners who liked X also liked Y" (PRD 10.4.2 v2, roadmap Day 9).
 * - computeSimilarities(): the nightly job — every user's positive songs
 *   (likes, completed plays and playlist adds in the last 90 days) become
 *   item-to-item co-occurrence scores, stored in trackSimilarities
 * - getSimilarTracks(): those neighbours first, topped up with songs that
 *   share genres / vibes / artist (so the row works from day one)
 * Pure helpers are exported for unit tests.
 */
import mongoose from "mongoose";
import { Like } from "../../models/like.model.js";
import { ListenEvent } from "../../models/listenEvent.model.js";
import { Playlist } from "../../models/playlist.model.js";
import { Track } from "../../models/track.model.js";
import { TrackSimilarity } from "../../models/trackSimilarity.model.js";
import { getCandidatePool } from "./candidatePool.js";
import { ApiError } from "../../utils/ApiError.js";
import { logger } from "../../utils/logger.js";
import {
  ERROR_CODES,
  SIMILAR_TRACKS_LIMIT,
  SIMILARITY_MAX_ITEMS_PER_USER,
  SIMILARITY_TOP_K,
  SIMILARITY_WINDOW_DAYS,
} from "../../config/constants.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified";
/** Shrinks scores backed by very few listeners (one shared fan is weak evidence). */
const SHRINKAGE = 2;

/* ===== Pure helpers ===== */

/**
 * Item-to-item cosine similarity from user → songs sets (pure — unit tested).
 *   score(a, b) = co(a, b) / √(n(a) · n(b)) × co / (co + SHRINKAGE)
 * @param {Map<string, Set<string>>|Array<Set<string>>} userItems - Each user's positive songs
 * @param {{ topK?: number, maxItemsPerUser?: number }} [options]
 * @returns {Map<string, Array<{ trackId: string, score: number }>>} song → neighbours, best first
 */
export function cooccurrenceSimilarities(userItems, options = {}) {
  const { topK = SIMILARITY_TOP_K, maxItemsPerUser = SIMILARITY_MAX_ITEMS_PER_USER } = options;
  const itemCount = new Map();
  const pairCount = new Map(); // "a|b" (a < b) → count
  for (const items of userItems.values()) {
    const list = [...items].sort().slice(0, maxItemsPerUser);
    for (const item of list) itemCount.set(item, (itemCount.get(item) ?? 0) + 1);
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const key = `${list[i]}|${list[j]}`;
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }
  const neighbours = new Map();
  const add = (from, to, score) => {
    if (!neighbours.has(from)) neighbours.set(from, []);
    neighbours.get(from).push({ trackId: to, score });
  };
  for (const [key, co] of pairCount) {
    const [a, b] = key.split("|");
    const score = (co / Math.sqrt(itemCount.get(a) * itemCount.get(b))) * (co / (co + SHRINKAGE));
    add(a, b, score);
    add(b, a, score);
  }
  for (const [item, list] of neighbours) {
    neighbours.set(item, list.sort((x, y) => y.score - x.score).slice(0, topK));
  }
  return neighbours;
}

/**
 * Overlap of two tag lists (Jaccard, 0–1).
 * @param {string[]} a
 * @param {string[]} b
 * @returns {number}
 */
function jaccard(a = [], b = []) {
  const first = new Set(a);
  const second = new Set(b);
  if (first.size === 0 || second.size === 0) return 0;
  let shared = 0;
  first.forEach((tag) => (shared += second.has(tag) ? 1 : 0));
  return shared / (first.size + second.size - shared);
}

/**
 * How alike two songs sound by their tags (pure — unit tested).
 * @param {{ id: string, artistId: string, genres: string[], vibes: string[], mood?: string|null }} seed
 * @param {Object} candidate - Same shape
 * @returns {number} 0–~1.8
 */
export function contentSimilarity(seed, candidate) {
  if (seed.id === candidate.id) return 0;
  return (
    jaccard(seed.genres, candidate.genres) +
    0.5 * jaccard(seed.vibes, candidate.vibes) +
    (seed.mood && seed.mood === candidate.mood ? 0.1 : 0) +
    (seed.artistId === candidate.artistId ? 0.2 : 0)
  );
}

/* ===== Nightly job ===== */

/**
 * Nightly job: rebuild trackSimilarities from the last 90 days of positive signals.
 * @returns {Promise<{ users: number, tracks: number }>}
 */
export async function computeSimilarities() {
  const since = new Date(Date.now() - SIMILARITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [likes, completes, playlists] = await Promise.all([
    Like.find({}).select("userId trackId").lean(),
    ListenEvent.find({ type: "complete", createdAt: { $gte: since } })
      .select("userId trackId")
      .lean(),
    Playlist.find({ type: "user", "tracks.addedAt": { $gte: since } })
      .select("ownerId tracks")
      .lean(),
  ]);
  const userItems = new Map();
  const add = (userId, trackId) => {
    const key = String(userId);
    if (!userItems.has(key)) userItems.set(key, new Set());
    userItems.get(key).add(String(trackId));
  };
  likes.forEach((like) => add(like.userId, like.trackId));
  completes.forEach((event) => add(event.userId, event.trackId));
  for (const playlist of playlists) {
    playlist.tracks
      .filter((entry) => entry.addedAt >= since)
      .forEach((entry) => add(playlist.ownerId, entry.trackId));
  }

  const neighbours = cooccurrenceSimilarities(userItems);
  const operations = [...neighbours].map(([trackId, similar]) => ({
    updateOne: {
      filter: { trackId: new mongoose.Types.ObjectId(trackId) },
      update: {
        $set: {
          similar: similar.map((entry) => ({
            trackId: new mongoose.Types.ObjectId(entry.trackId),
            score: entry.score,
          })),
        },
      },
      upsert: true,
    },
  }));
  if (operations.length) await TrackSimilarity.bulkWrite(operations, { ordered: false });
  // Songs with no neighbours any more
  await TrackSimilarity.deleteMany({
    trackId: { $nin: [...neighbours.keys()].map((id) => new mongoose.Types.ObjectId(id)) },
  });
  logger.info(
    `[Similarity] ${userItems.size} listeners → ${neighbours.size} songs with neighbours`
  );
  return { users: userItems.size, tracks: neighbours.size };
}

/* ===== Reading ===== */

/**
 * Similar song ids for a seed song: co-listened first, then tag matches.
 * @param {string} trackId
 * @param {{ catalog?: string, limit?: number, exclude?: Set<string> }} [options]
 * @returns {Promise<Array<{ id: string, score: number, why: "cooccurrence"|"content" }>>}
 */
export async function similarTrackIds(
  trackId,
  { catalog = "all", limit = SIMILAR_TRACKS_LIMIT, exclude = new Set() } = {}
) {
  const pool = await getCandidatePool(catalog);
  const byId = new Map(pool.map((track) => [track.id, track]));
  const seed = byId.get(String(trackId)) ?? (await loadSeed(trackId));
  if (!seed) return [];
  const skip = new Set([...exclude, String(trackId)]);

  const doc = await TrackSimilarity.findOne({ trackId }).lean();
  const result = (doc?.similar ?? [])
    .map((entry) => ({ id: String(entry.trackId), score: 1 + entry.score, why: "cooccurrence" }))
    .filter((entry) => byId.has(entry.id) && !skip.has(entry.id));
  const taken = new Set(result.map((entry) => entry.id));

  if (result.length < limit) {
    const content = pool
      .filter((track) => !skip.has(track.id) && !taken.has(track.id))
      .map((track) => ({
        id: track.id,
        // A little popularity breaks ties between equally similar songs
        score: contentSimilarity(seed, track) + Math.log10(1 + track.playCount) * 0.01,
        why: "content",
      }))
      .filter((entry) => entry.score > 0.15)
      .sort((a, b) => b.score - a.score);
    result.push(...content.slice(0, limit - result.length));
  }
  return result.slice(0, limit);
}

/**
 * Seed song tags when it isn't in the candidate pool (e.g. another catalog).
 * @param {string} trackId
 * @returns {Promise<Object|null>}
 */
async function loadSeed(trackId) {
  const track = await Track.findOne({ _id: trackId, status: "published" })
    .select("artistId genres vibes mood")
    .lean();
  if (!track) return null;
  return {
    id: String(track._id),
    artistId: String(track.artistId),
    genres: track.genres ?? [],
    vibes: track.vibes ?? [],
    mood: track.mood ?? null,
  };
}

/**
 * GET /tracks/:id/similar — full songs.
 * @param {string} trackId
 * @param {{ catalog?: string, limit?: number }} [options]
 * @returns {Promise<{ seed: Object, items: Array<{ track: Object, reason: string }> }>}
 * @throws {ApiError} 404 when the song doesn't exist
 */
export async function getSimilarTracks(trackId, options = {}) {
  const seed = await Track.findOne({ _id: trackId, status: "published" }).select("title").lean();
  if (!seed) throw ApiError.notFound("Song not found", { code: ERROR_CODES.NOT_FOUND });
  const ranked = await similarTrackIds(trackId, options);
  const tracks = await Track.find({
    _id: { $in: ranked.map((entry) => entry.id) },
    status: "published",
  })
    .populate("artistId", ARTIST_REF_FIELDS)
    .lean();
  const byId = new Map(tracks.map((track) => [String(track._id), track]));
  return {
    seed: { id: String(seed._id), title: seed.title },
    items: ranked
      .filter((entry) => byId.has(entry.id))
      .map((entry) => ({
        track: byId.get(entry.id),
        reason:
          entry.why === "cooccurrence"
            ? `Fans of ${seed.title} also like this`
            : `Sounds like ${seed.title}`,
      })),
  };
}
