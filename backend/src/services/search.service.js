/**
 * Search (PRD SRC-1/2, CAT-2/5, roadmap Day 7):
 * - GET /search: grouped results — tracks, artists, playlists, genres & vibes
 * - typo-tolerant: MongoDB Atlas Search (fuzzy) when the cluster has the
 *   search indexes (`npm run search:setup`); otherwise — and always for Hindi
 *   in Devanagari script — the in-memory fuzzy index (searchIndex.service)
 * - catalog switch (all / official / community) on songs
 * - voice best match: "play <song> [by <artist>]", artists, playlists, vibes;
 *   Official songs win close calls (CAT-5); low confidence → top 3 to pick from
 */
import mongoose from "mongoose";
import { Track } from "../models/track.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Genre } from "../models/genre.model.js";
import { Vibe } from "../models/vibe.model.js";
import { User } from "../models/user.model.js";
import { rankArtists, rankTracks } from "./searchIndex.service.js";
import { remember } from "./cache.service.js";
import { hasDevanagari, matchScore, prepareText } from "../utils/textMatch.js";
import { RECENT_SEARCHES_MAX, SEARCH_RESULTS, VOICE_CONFIDENT_SCORE } from "../config/constants.js";
import { logger } from "../utils/logger.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified";
const ATLAS_RETRY_MS = 10 * 60 * 1000;
const OFFICIAL_BOOST = 0.04; // CAT-5: Official first when matches are close
const PLAYLIST_CANDIDATES = 2000;
let atlasUnavailableUntil = 0;

/* ===== Atlas Search (optional) ===== */

/**
 * Run a $search pipeline, or return null when Atlas Search isn't available
 * (local MongoDB, or the index doesn't exist yet).
 * @param {mongoose.Model} Model
 * @param {string} indexName
 * @param {Object} search - The $search stage body (without `index`)
 * @param {Object[]} after - Stages after $search
 * @returns {Promise<Object[]|null>}
 */
async function atlasSearch(Model, indexName, search, after) {
  if (Date.now() < atlasUnavailableUntil) return null;
  try {
    const results = await Model.aggregate([{ $search: { index: indexName, ...search } }, ...after]);
    return results;
  } catch (error) {
    atlasUnavailableUntil = Date.now() + ATLAS_RETRY_MS;
    logger.debug(`[Search] Atlas Search unavailable, using the built-in index: ${error.message}`);
    return null;
  }
}

/**
 * Typo-tolerant match on some fields (Atlas "text" with fuzzy).
 * @param {string} query
 * @param {Array<{ path: string, boost: number }>} fields
 * @returns {Object}
 */
function fuzzyCompound(query, fields) {
  return {
    compound: {
      should: fields.map(({ path, boost }) => ({
        text: {
          query,
          path,
          fuzzy: { maxEdits: 2, prefixLength: 1 },
          score: { boost: { value: boost } },
        },
      })),
      minimumShouldMatch: 1,
    },
  };
}

/* ===== Loading full documents in rank order ===== */

/**
 * Published tracks (with artist) in the given order.
 * @param {string[]} ids
 * @returns {Promise<Object[]>}
 */
async function loadTracks(ids) {
  if (ids.length === 0) return [];
  const tracks = await Track.find({ _id: { $in: ids }, status: "published" })
    .populate("artistId", ARTIST_REF_FIELDS)
    .lean();
  const byId = new Map(tracks.map((track) => [String(track._id), track]));
  return ids.map((id) => byId.get(String(id))).filter(Boolean);
}

/**
 * @param {string[]} ids
 * @returns {Promise<Object[]>}
 */
async function loadArtists(ids) {
  if (ids.length === 0) return [];
  const artists = await ArtistProfile.find({ _id: { $in: ids } }).lean();
  const byId = new Map(artists.map((artist) => [String(artist._id), artist]));
  return ids.map((id) => byId.get(String(id))).filter(Boolean);
}

/* ===== Searching each group ===== */

/**
 * @param {string} query
 * @param {string} catalog
 * @param {number} limit
 * @returns {Promise<Object[]>} Track documents, best first
 */
async function searchTracks(query, catalog, limit) {
  if (!hasDevanagari(query)) {
    const atlas = await atlasSearch(
      Track,
      "tracks_search",
      fuzzyCompound(query, [
        { path: "title", boost: 3 },
        { path: "artistName", boost: 2 },
        { path: "genres", boost: 1 },
        { path: "vibes", boost: 1 },
      ]),
      [
        { $match: { status: "published", ...(catalog !== "all" && { catalog }) } },
        { $limit: limit },
        { $project: { _id: 1 } },
      ]
    );
    if (atlas?.length) return loadTracks(atlas.map((doc) => doc._id));
  }
  const ranked = await rankTracks(query, { catalog, limit });
  return loadTracks(ranked.map((result) => result.id));
}

/**
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function searchArtists(query, limit) {
  if (!hasDevanagari(query)) {
    const atlas = await atlasSearch(
      ArtistProfile,
      "artists_search",
      fuzzyCompound(query, [{ path: "stageName", boost: 1 }]),
      [{ $limit: limit }, { $project: { _id: 1 } }]
    );
    if (atlas?.length) return loadArtists(atlas.map((doc) => doc._id));
  }
  const ranked = await rankArtists(query, { limit });
  return loadArtists(ranked.map((result) => result.id));
}

/**
 * Public playlists, plus the viewer's own (private ones too).
 * @param {string} query
 * @param {string|null} viewerId
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function searchPlaylists(query, viewerId, limit) {
  const visible = {
    type: "user",
    $or: [
      { isPublic: true },
      ...(viewerId ? [{ ownerId: new mongoose.Types.ObjectId(String(viewerId)) }] : []),
    ],
  };
  if (!hasDevanagari(query)) {
    const atlas = await atlasSearch(
      Playlist,
      "playlists_search",
      fuzzyCompound(query, [{ path: "name", boost: 1 }]),
      [{ $match: visible }, { $limit: limit }]
    );
    if (atlas?.length) return atlas;
  }
  const candidates = await Playlist.find(visible)
    .sort({ updatedAt: -1 })
    .limit(PLAYLIST_CANDIDATES)
    .lean();
  const prepared = prepareText(query);
  return candidates
    .map((playlist) => ({ playlist, score: matchScore(prepared, prepareText(playlist.name)) }))
    .filter((entry) => entry.score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.playlist);
}

/**
 * Active genres and vibes (cached for a few minutes).
 * @returns {Promise<{ genres: Object[], vibes: Object[] }>}
 */
export function getActiveTaxonomy() {
  return remember("taxonomy:active", 5 * 60, async () => {
    const fields = "slug name icon colour description order";
    const [genres, vibes] = await Promise.all([
      Genre.find({ active: true }).sort({ order: 1 }).select(fields).lean(),
      Vibe.find({ active: true }).sort({ order: 1 }).select(fields).lean(),
    ]);
    const strip = ({ _id, ...rest }) => rest;
    return { genres: genres.map(strip), vibes: vibes.map(strip) };
  });
}

/**
 * Genres and vibes whose name matches.
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<Array<Object & { kind: "genre"|"vibe", score: number }>>}
 */
async function searchTaxonomy(query, limit) {
  const { genres, vibes } = await getActiveTaxonomy();
  const prepared = prepareText(query);
  return [
    ...genres.map((item) => ({ ...item, kind: "genre" })),
    ...vibes.map((item) => ({ ...item, kind: "vibe" })),
  ]
    .map((item) => ({
      ...item,
      score: Math.max(
        matchScore(prepared, prepareText(item.name)),
        matchScore(prepared, prepareText(item.slug.replace(/-/g, " ")))
      ),
    }))
    .filter((item) => item.score >= 0.65)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Grouped search (SRC-1).
 * @param {string} query
 * @param {{ catalog?: string, viewerId?: string|null }} options
 * @returns {Promise<{ tracks: Object[], artists: Object[], playlists: Object[], categories: Object[] }>}
 */
export async function search(query, { catalog = "all", viewerId = null } = {}) {
  const [tracks, artists, playlists, categories] = await Promise.all([
    searchTracks(query, catalog, SEARCH_RESULTS.tracks),
    searchArtists(query, SEARCH_RESULTS.artists),
    searchPlaylists(query, viewerId, SEARCH_RESULTS.playlists),
    searchTaxonomy(query, SEARCH_RESULTS.genres),
  ]);
  return { tracks, artists, playlists, categories };
}

/* ===== Voice best match (VOC-4, CAT-5) ===== */

/**
 * Split "song by artist" / Hindi "artist ka song" (pure — unit tested).
 * @param {string} text
 * @returns {{ title: string, artist: string|null }}
 */
export function splitSongAndArtist(text) {
  const cleaned = String(text).trim();
  const byMatch = /^(.+?)\s+(?:by|from|बाय)\s+(.+)$/i.exec(cleaned);
  if (byMatch) return { title: byMatch[1].trim(), artist: byMatch[2].trim() };
  const kaMatch = /^(.+?)\s+(?:ka|ki|ke|का|की|के)\s+(.+)$/i.exec(cleaned);
  if (kaMatch) return { title: kaMatch[2].trim(), artist: kaMatch[1].trim() };
  return { title: cleaned, artist: null };
}

/**
 * Best thing to play for a spoken request.
 * @param {string} query - What came after "play" (e.g. "tum hi ho by arijit singh")
 * @param {{ catalog?: string, viewerId?: string|null }} options
 * @returns {Promise<{ query: string, confident: boolean, best: Object|null, candidates: Object[] }>}
 *   Each candidate: { type: "track"|"artist"|"playlist"|"genre"|"vibe", score, item }
 */
export async function voiceLookup(query, { catalog = "all", viewerId = null } = {}) {
  const { title, artist } = splitSongAndArtist(query);
  const [byTitle, whole, artists, playlists, categories] = await Promise.all([
    artist
      ? rankTracks(title, { catalog, limit: 5, minScore: 0.5, artistQuery: artist })
      : Promise.resolve([]),
    rankTracks(query, { catalog, limit: 5, minScore: 0.5 }),
    rankArtists(query, { limit: 3, minScore: 0.6 }),
    viewerId
      ? searchPlaylists(
          query.replace(/\b(my|playlist|मेरी|मेरा)\b/gi, " ").trim() || query,
          viewerId,
          3
        )
      : Promise.resolve([]),
    searchTaxonomy(query.replace(/\b(vibe|music|songs?|गाने)\b/gi, " ").trim() || query, 3),
  ]);

  // Songs: the "by artist" reading wins when it fits better; Official first on close calls
  const trackScores = new Map();
  for (const result of [...byTitle, ...whole]) {
    const boosted = result.score + (result.catalog === "official" ? OFFICIAL_BOOST : 0);
    trackScores.set(result.id, Math.max(trackScores.get(result.id) ?? 0, boosted));
  }
  const trackIds = [...trackScores.keys()];
  const tracks = await loadTracks(trackIds);
  const preparedQuery = prepareText(query);
  const candidates = [
    ...tracks.map((item) => ({ type: "track", score: trackScores.get(String(item._id)), item })),
    ...(await loadArtists(artists.map((entry) => entry.id))).map((item, index) => ({
      type: "artist",
      score: artists[index].score,
      item,
    })),
    ...playlists.map((item) => ({
      type: "playlist",
      score: Math.max(0.6, matchScore(preparedQuery, prepareText(item.name))),
      item,
    })),
    ...categories.map((item) => ({ type: item.kind, score: item.score, item })),
  ].sort((a, b) => b.score - a.score);

  const [best, second] = candidates;
  const confident = Boolean(
    best &&
    best.score >= VOICE_CONFIDENT_SCORE &&
    (!second || best.score - second.score >= 0.05 || second.type !== best.type)
  );
  return { query, confident, best: best ?? null, candidates: candidates.slice(0, 3) };
}

/* ===== Recent searches (SRC-3) ===== */

/**
 * The signed-in user's recent searches, newest first.
 * @param {string} userId
 * @returns {Promise<Array<{ query: string, at: Date }>>}
 */
export async function getRecentSearches(userId) {
  const user = await User.findById(userId).select("recentSearches").lean();
  return user?.recentSearches ?? [];
}

/**
 * Remember a search (moves a repeated one to the top; keeps the last 10).
 * @param {string} userId
 * @param {string} query
 * @returns {Promise<Array<{ query: string, at: Date }>>}
 */
export async function addRecentSearch(userId, query) {
  const lower = query.toLowerCase();
  const existing = await getRecentSearches(userId);
  const recent = [
    { query, at: new Date() },
    ...existing.filter((entry) => entry.query.toLowerCase() !== lower),
  ].slice(0, RECENT_SEARCHES_MAX);
  await User.updateOne({ _id: userId }, { $set: { recentSearches: recent } });
  return recent;
}

/**
 * Forget one recent search, or all of them.
 * @param {string} userId
 * @param {string|null} [query] - null clears the list
 * @returns {Promise<Array<{ query: string, at: Date }>>}
 */
export async function removeRecentSearch(userId, query = null) {
  if (!query) {
    await User.updateOne({ _id: userId }, { $set: { recentSearches: [] } });
    return [];
  }
  const lower = query.toLowerCase();
  const recent = (await getRecentSearches(userId)).filter(
    (entry) => entry.query.toLowerCase() !== lower
  );
  await User.updateOne({ _id: userId }, { $set: { recentSearches: recent } });
  return recent;
}
