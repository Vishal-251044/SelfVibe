/**
 * In-memory search index of published songs and artists (roadmap Day 7).
 * Each entry keeps its prepared text (transliterated, spelling-insensitive),
 * so fuzzy and Hindi (Devanagari) lookups are fast. Rebuilt at most once a
 * minute. Used for voice "play <song>", Devanagari queries, and as the search
 * fallback when Atlas Search isn't available.
 * Sized for the PRD's catalog (5,000+ songs); a projection keeps it small.
 */
import { Track } from "../models/track.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { matchScore, prepareText } from "../utils/textMatch.js";
import { logger } from "../utils/logger.js";

const REFRESH_MS = 60 * 1000;
let index = null; // { tracks, artists, builtAt }
let building = null;

/**
 * Build the index from the database.
 * @returns {Promise<{ tracks: Object[], artists: Object[], builtAt: number }>}
 */
async function build() {
  const [tracks, artists] = await Promise.all([
    Track.find({ status: "published" })
      .select("title artistName artistId catalog genres vibes playCount")
      .lean(),
    ArtistProfile.find({}).select("stageName popularity followersCount userId").lean(),
  ]);
  const artistIdsWithSongs = new Set(tracks.map((track) => String(track.artistId)));
  return {
    tracks: tracks.map((track) => ({
      id: String(track._id),
      artistId: String(track.artistId),
      catalog: track.catalog ?? "community",
      genres: track.genres ?? [],
      vibes: track.vibes ?? [],
      playCount: track.playCount ?? 0,
      title: prepareText(track.title),
      artist: prepareText(track.artistName ?? ""),
    })),
    // Official artists always; creators once they have a live song
    artists: artists
      .filter((artist) => !artist.userId || artistIdsWithSongs.has(String(artist._id)))
      .map((artist) => ({
        id: String(artist._id),
        popularity: (artist.popularity ?? 0) + (artist.followersCount ?? 0),
        name: prepareText(artist.stageName),
      })),
    builtAt: Date.now(),
  };
}

/**
 * The current index (rebuilt when older than a minute).
 * @returns {Promise<{ tracks: Object[], artists: Object[] }>}
 */
export async function getSearchIndex() {
  if (index && Date.now() - index.builtAt < REFRESH_MS) return index;
  building ??= build()
    .then((built) => {
      index = built;
      return built;
    })
    .catch((error) => {
      logger.error(`[SearchIndex] rebuild failed: ${error.message}`);
      if (index) return index;
      throw error;
    })
    .finally(() => {
      building = null;
    });
  return building;
}

/** Forget the index (tests; big catalog changes). */
export function resetSearchIndex() {
  index = null;
}

/**
 * Rank songs for a query. A song can match on its title, its artist, or
 * "title by artist" combined.
 * @param {string} query
 * @param {{ catalog?: "all"|"official"|"community", limit?: number, minScore?: number, artistQuery?: string }} [options]
 *   artistQuery: the "by <artist>" part of a voice command, scored separately
 * @returns {Promise<Array<{ id: string, score: number, catalog: string, artistId: string }>>}
 */
export async function rankTracks(
  query,
  { catalog = "all", limit = 20, minScore = 0.55, artistQuery } = {}
) {
  const { tracks } = await getSearchIndex();
  const prepared = prepareText(query);
  const preparedArtist = artistQuery ? prepareText(artistQuery) : null;
  const results = [];
  for (const track of tracks) {
    if (catalog !== "all" && track.catalog !== catalog) continue;
    const titleScore = matchScore(prepared, track.title);
    let score;
    if (preparedArtist) {
      // "play <song> by <artist>": both parts must fit
      score = 0.7 * titleScore + 0.3 * matchScore(preparedArtist, track.artist);
    } else {
      const artistScore = matchScore(prepared, track.artist) * 0.92; // title matches win ties
      score = Math.max(titleScore, artistScore);
    }
    if (score >= minScore)
      results.push({
        id: track.id,
        score,
        catalog: track.catalog,
        artistId: track.artistId,
        playCount: track.playCount,
      });
  }
  return results.sort((a, b) => b.score - a.score || b.playCount - a.playCount).slice(0, limit);
}

/**
 * Rank artists for a query.
 * @param {string} query
 * @param {{ limit?: number, minScore?: number }} [options]
 * @returns {Promise<Array<{ id: string, score: number }>>}
 */
export async function rankArtists(query, { limit = 8, minScore = 0.6 } = {}) {
  const { artists } = await getSearchIndex();
  const prepared = prepareText(query);
  return artists
    .map((artist) => ({
      id: artist.id,
      score: matchScore(prepared, artist.name),
      popularity: artist.popularity,
    }))
    .filter((artist) => artist.score >= minScore)
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
    .slice(0, limit);
}
