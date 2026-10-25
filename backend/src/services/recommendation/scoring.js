/**
 * Recommendation engine v1 scoring (PRD 10.4.2 v1, roadmap Day 8):
 *   score = Σ(tag affinity × share) + popularity + freshness − recently-played penalty
 * Affinities come from the user's taste vector, scaled to −1…1 per tag type
 * so a long listening history doesn't drown out popularity and freshness.
 * Every score also carries the strongest reason, for the "Why this?" label.
 * Pure functions only (unit tested).
 */
import { FEED_RULES, FEED_SCORE_WEIGHTS } from "../../config/constants.js";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Below this, a tag isn't a convincing "because you like…" reason. */
const REASON_MIN_AFFINITY = 0.15;

/**
 * Scale a tag → weight map to −1…1 (divide by the largest absolute weight).
 * @param {Map<string, number>|Object<string, number>|undefined} weights
 * @returns {Object<string, number>}
 */
export function normaliseWeights(weights) {
  const entries = weights instanceof Map ? [...weights] : Object.entries(weights ?? {});
  const maxAbs = Math.max(0, ...entries.map(([, value]) => Math.abs(Number(value) || 0)));
  if (maxAbs === 0) return {};
  return Object.fromEntries(entries.map(([key, value]) => [key, (Number(value) || 0) / maxAbs]));
}

/**
 * Taste profile → the shape scoring needs.
 * @param {Object|null} profile - Lean TasteProfile
 * @returns {{ genre: Object, vibe: Object, artist: Object, mood: Object, energyPref: number, hasTaste: boolean }}
 */
export function prepareTaste(profile) {
  const taste = {
    genre: normaliseWeights(profile?.genreWeights),
    vibe: normaliseWeights(profile?.vibeWeights),
    artist: normaliseWeights(profile?.artistWeights),
    mood: normaliseWeights(profile?.moodWeights),
    energyPref: profile?.energyPref ?? 0.5,
  };
  taste.hasTaste = [taste.genre, taste.vibe, taste.artist].some((map) =>
    Object.values(map).some((value) => value > 0)
  );
  return taste;
}

/**
 * Average affinity of a track's tags, and the best-liked tag.
 * @param {string[]} tags
 * @param {Object<string, number>} weights - Normalised
 * @returns {{ value: number, best: string|null, bestValue: number }}
 */
function tagAffinity(tags, weights) {
  const unique = [...new Set(tags ?? [])];
  if (unique.length === 0) return { value: 0, best: null, bestValue: 0 };
  let total = 0;
  let best = null;
  let bestValue = -Infinity;
  for (const tag of unique) {
    const value = weights[tag] ?? 0;
    total += value;
    if (value > bestValue) {
      best = tag;
      bestValue = value;
    }
  }
  return { value: total / unique.length, best, bestValue };
}

/**
 * Score one candidate track for one user.
 * @param {{ id: string, artistId: string, genres: string[], vibes: string[], mood?: string|null, energy?: number|null, playCount?: number, publishedAt?: Date|string|null }} track
 * @param {ReturnType<typeof prepareTaste>} taste
 * @param {{ now?: number, maxPlayCount?: number, recentlyPlayed?: Set<string>, heardArtists?: Set<string> }} [context]
 * @returns {{ score: number, familiar: boolean, reason: { type: "artist"|"genre"|"vibe"|"popular"|"new"|"discovery", key?: string } }}
 */
export function scoreTrack(track, taste, context = {}) {
  const {
    now = Date.now(),
    maxPlayCount = 0,
    recentlyPlayed = new Set(),
    heardArtists = new Set(),
  } = context;
  const w = FEED_SCORE_WEIGHTS;

  const genre = tagAffinity(track.genres, taste.genre);
  const vibe = tagAffinity(track.vibes, taste.vibe);
  const artist = taste.artist[track.artistId] ?? 0;
  const mood = track.mood ? (taste.mood[track.mood] ?? 0) : 0;
  const energy =
    typeof track.energy === "number"
      ? 1 - Math.min(1, Math.abs(track.energy - taste.energyPref) * 2)
      : 0;

  const popularity =
    maxPlayCount > 0 ? Math.log1p(track.playCount ?? 0) / Math.log1p(maxPlayCount) : 0;
  const ageDays = track.publishedAt
    ? Math.max(0, (now - new Date(track.publishedAt).getTime()) / DAY_MS)
    : Infinity;
  const freshness = Number.isFinite(ageDays) ? Math.exp(-ageDays / FEED_RULES.freshnessDays) : 0;
  const isRecent = recentlyPlayed.has(track.id);

  const tagScore =
    w.genre * genre.value +
    w.vibe * vibe.value +
    w.artist * artist +
    w.mood * mood +
    w.energy * energy;
  const score =
    tagScore +
    w.popularity * popularity +
    w.freshness * freshness -
    (isRecent ? w.recentlyPlayed : 0);

  // Strongest personal reason first; otherwise popularity / newness
  const candidates = [
    // A liked artist is the clearest reason, so it gets a small edge
    { type: "artist", key: track.artistId, affinity: artist, strength: artist * w.artist * 1.5 },
    {
      type: "genre",
      key: genre.best,
      affinity: genre.bestValue,
      strength: genre.bestValue * w.genre,
    },
    { type: "vibe", key: vibe.best, affinity: vibe.bestValue, strength: vibe.bestValue * w.vibe },
  ].filter((entry) => entry.key && entry.affinity >= REASON_MIN_AFFINITY);
  candidates.sort((a, b) => b.strength - a.strength);
  let reason;
  if (candidates.length > 0) reason = { type: candidates[0].type, key: candidates[0].key };
  else if (freshness > 0.6) reason = { type: "new" };
  else if (popularity > 0.5) reason = { type: "popular" };
  else reason = { type: "discovery" };

  // Familiar = an artist you know, or a genre / vibe you like; everything else is discovery
  const familiar =
    heardArtists.has(track.artistId) ||
    artist > 0 ||
    genre.bestValue >= REASON_MIN_AFFINITY ||
    vibe.bestValue >= REASON_MIN_AFFINITY;
  return { score, familiar, reason };
}

/**
 * Score and sort candidates, best first.
 * @param {Object[]} tracks - Candidates (see scoreTrack)
 * @param {ReturnType<typeof prepareTaste>} taste
 * @param {Object} context - See scoreTrack (maxPlayCount is filled in when missing)
 * @returns {Array<{ track: Object, score: number, familiar: boolean, reason: Object }>}
 */
export function rankTracks(tracks, taste, context = {}) {
  const maxPlayCount =
    context.maxPlayCount ?? Math.max(0, ...tracks.map((track) => track.playCount ?? 0));
  return tracks
    .map((track) => ({ track, ...scoreTrack(track, taste, { ...context, maxPlayCount }) }))
    .sort((a, b) => b.score - a.score);
}
