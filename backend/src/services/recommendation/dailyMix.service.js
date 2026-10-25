/**
 * Daily Mix 1–3 (PRD 10.4.3, roadmap Day 9): one mix per top taste cluster —
 * the user's favourite genres (vibes fill in when there are fewer than three).
 * Each mix holds the best-scored songs of that cluster (max 3 per artist),
 * shuffled with a seed of user + day, so it stays the same all day and
 * changes tomorrow. Respects the catalog switch; cached for an hour.
 */
import mongoose from "mongoose";
import { Track } from "../../models/track.model.js";
import { TasteProfile } from "../../models/tasteProfile.model.js";
import { ArtistProfile } from "../../models/artistProfile.model.js";
import { getCandidatePool } from "./candidatePool.js";
import { prepareTaste, rankTracks } from "./scoring.js";
import { pickDiverse } from "./feedRules.js";
import { getActiveTaxonomy } from "../search.service.js";
import { remember } from "../cache.service.js";
import { zonedDateString } from "../../utils/dates.js";
import { DAILY_MIX_COUNT, DAILY_MIX_SIZE, STATS_TIMEZONE } from "../../config/constants.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified";
const MIX_CACHE_SECONDS = 60 * 60;
const MIN_MIX_SONGS = 5;

/**
 * Small seeded random generator (mulberry32) — same seed, same order.
 * @param {string} seedText
 * @returns {() => number} 0 ≤ n < 1
 */
export function seededRandom(seedText) {
  let seed = 0;
  for (const char of seedText) seed = (Math.imul(31, seed) + char.charCodeAt(0)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle with a seed (pure — unit tested).
 * @template T
 * @param {T[]} items
 * @param {string} seedText
 * @returns {T[]}
 */
export function seededShuffle(items, seedText) {
  const random = seededRandom(seedText);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * The user's top clusters: favourite genres, then vibes (pure — unit tested).
 * @param {{ genre: Object<string, number>, vibe: Object<string, number> }} taste - Normalised
 * @param {number} count
 * @returns {Array<{ kind: "genre"|"vibe", slug: string }>}
 */
export function topClusters(taste, count = DAILY_MIX_COUNT) {
  const best = (weights, kind) =>
    Object.entries(weights)
      .filter(([, weight]) => weight > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([slug]) => ({ kind, slug }));
  return [...best(taste.genre, "genre"), ...best(taste.vibe, "vibe")].slice(0, count);
}

/**
 * Build the mixes (ids only, cacheable).
 * @param {string} userId
 * @param {string} catalog
 * @param {string} day - "YYYY-MM-DD"
 * @returns {Promise<Object[]>}
 */
async function buildMixes(userId, catalog, day) {
  const profile = await TasteProfile.findOne({ userId }).lean();
  const taste = prepareTaste(profile);
  if (!taste.hasTaste) return [];
  const hidden = new Set((profile?.hiddenTrackIds ?? []).map(String));
  const ownArtist = await ArtistProfile.findOne({ userId }).select("_id").lean();
  const pool = (await getCandidatePool(catalog)).filter(
    (track) => !hidden.has(track.id) && track.artistId !== String(ownArtist?._id ?? "")
  );
  const ranked = rankTracks(pool, taste);
  const { genres, vibes } = await getActiveTaxonomy();
  const names = new Map([
    ...genres.map((g) => [`genre:${g.slug}`, g.name]),
    ...vibes.map((v) => [`vibe:${v.slug}`, v.name]),
  ]);

  const mixes = [];
  const used = new Set();
  for (const cluster of topClusters(taste, DAILY_MIX_COUNT + 2)) {
    if (mixes.length >= DAILY_MIX_COUNT) break;
    const field = cluster.kind === "genre" ? "genres" : "vibes";
    // Each song lands in one mix only, so the three mixes feel different
    const inCluster = ranked.filter(
      (item) => item.track[field].includes(cluster.slug) && !used.has(item.track.id)
    );
    const best = pickDiverse(inCluster, {
      size: Math.round(DAILY_MIX_SIZE * 1.5),
      maxPerArtist: 3,
      familiarShare: null,
    });
    if (best.length < MIN_MIX_SONGS) continue;
    const chosen = seededShuffle(best, `${userId}|${day}|${cluster.kind}:${cluster.slug}`).slice(
      0,
      DAILY_MIX_SIZE
    );
    chosen.forEach((item) => used.add(item.track.id));
    mixes.push({
      index: mixes.length + 1,
      tag: {
        kind: cluster.kind,
        slug: cluster.slug,
        name: names.get(`${cluster.kind}:${cluster.slug}`) ?? cluster.slug,
      },
      trackIds: chosen.map((item) => item.track.id),
    });
  }
  return mixes;
}

/**
 * Daily Mix 1–3 with full songs.
 * @param {string} userId
 * @param {{ catalog?: string }} [options]
 * @returns {Promise<Array<{ index: number, title: string, subtitle: string, tag: Object, coverUrls: string[], tracks: Object[] }>>}
 */
export async function getDailyMixes(userId, { catalog = "all" } = {}) {
  const day = zonedDateString(new Date(), STATS_TIMEZONE);
  const mixes = await remember(`dailymix:${userId}:${catalog}:${day}`, MIX_CACHE_SECONDS, () =>
    buildMixes(userId, catalog, day)
  );
  const ids = mixes.flatMap((mix) => mix.trackIds);
  const tracks = ids.length
    ? await Track.find({
        _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
        status: "published",
      })
        .populate("artistId", ARTIST_REF_FIELDS)
        .lean()
    : [];
  const byId = new Map(tracks.map((track) => [String(track._id), track]));

  return mixes
    .map((mix) => {
      const songs = mix.trackIds.map((id) => byId.get(id)).filter(Boolean);
      const artistNames = [
        ...new Set(songs.map((song) => song.artistId?.stageName).filter(Boolean)),
      ];
      return {
        index: mix.index,
        title: `Daily Mix ${mix.index}`,
        subtitle:
          artistNames.length > 2
            ? `${artistNames.slice(0, 2).join(", ")} and more`
            : artistNames.join(" and "),
        tag: mix.tag,
        coverUrls: songs
          .map((song) => song.coverUrl)
          .filter(Boolean)
          .slice(0, 4),
        tracks: songs,
      };
    })
    .filter((mix) => mix.tracks.length > 0);
}
