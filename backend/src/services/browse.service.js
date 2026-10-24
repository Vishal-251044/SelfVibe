/**
 * Browse (PRD BRW-1/2/3, CAT-2, roadmap Day 7):
 * - genres and vibes with song counts and a cover (from the managed taxonomy)
 * - a genre / vibe page: its songs, most played first
 * - Trending: most played in the last 7 days (cached 10 minutes, per catalog)
 * - New Releases: newest published songs
 * Every song list honours the Official · Community · All switch.
 */
import { Track } from "../models/track.model.js";
import { Genre } from "../models/genre.model.js";
import { Vibe } from "../models/vibe.model.js";
import { ListenEvent } from "../models/listenEvent.model.js";
import { remember } from "./cache.service.js";
import { getActiveTaxonomy } from "./search.service.js";
import { buildPageMeta } from "../helpers/genericFunctions.js";
import { ApiError } from "../utils/ApiError.js";
import {
  BROWSE_PAGE_SIZE,
  ERROR_CODES,
  TRENDING_CACHE_SECONDS,
  TRENDING_WINDOW_DAYS,
} from "../config/constants.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified";
const TRENDING_MAX = 50;
const CATEGORY_STATS_SECONDS = 10 * 60;
const MODELS = { genre: Genre, vibe: Vibe };
const TRACK_FIELD = { genre: "genres", vibe: "vibes" };

/**
 * Mongo filter for published songs in a catalog.
 * @param {"all"|"official"|"community"} catalog
 * @returns {Object}
 */
export function publishedFilter(catalog = "all") {
  return { status: "published", ...(catalog !== "all" && { catalog }) };
}

/**
 * Song count and a cover image per category slug.
 * @param {"genre"|"vibe"} kind
 * @param {string} catalog
 * @returns {Promise<Object<string, { trackCount: number, coverUrl: string|null }>>}
 */
function categoryStats(kind, catalog) {
  const field = TRACK_FIELD[kind];
  return remember(`browse:stats:${kind}:${catalog}`, CATEGORY_STATS_SECONDS, async () => {
    const rows = await Track.aggregate([
      { $match: publishedFilter(catalog) },
      { $sort: { playCount: -1 } },
      { $unwind: `$${field}` },
      {
        $group: {
          _id: `$${field}`,
          trackCount: { $sum: 1 },
          coverUrl: { $first: "$coverUrl" },
        },
      },
    ]);
    return Object.fromEntries(
      rows.map((row) => [row._id, { trackCount: row.trackCount, coverUrl: row.coverUrl ?? null }])
    );
  });
}

/**
 * Browse grid: active genres or vibes in staff order, with counts and covers.
 * @param {"genre"|"vibe"} kind
 * @param {{ catalog?: string }} [options]
 * @returns {Promise<Object[]>}
 */
export async function listCategories(kind, { catalog = "all" } = {}) {
  const [taxonomy, stats] = await Promise.all([getActiveTaxonomy(), categoryStats(kind, catalog)]);
  const items = kind === "genre" ? taxonomy.genres : taxonomy.vibes;
  return items.map((item) => ({
    ...item,
    trackCount: stats[item.slug]?.trackCount ?? 0,
    coverUrl: stats[item.slug]?.coverUrl ?? null,
  }));
}

/**
 * A genre or vibe page: the category and its songs, most played first.
 * @param {"genre"|"vibe"} kind
 * @param {string} slug
 * @param {{ catalog?: string, page?: number, limit?: number, sort?: "popular"|"new" }} [options]
 * @returns {Promise<{ category: Object, items: Object[], meta: Object }>}
 * @throws {ApiError} 404 when the category doesn't exist or is hidden
 */
export async function getCategoryPage(kind, slug, options = {}) {
  const { catalog = "all", page = 1, limit = BROWSE_PAGE_SIZE, sort = "popular" } = options;
  const category = await MODELS[kind]
    .findOne({ slug, active: true })
    .select("slug name icon colour description")
    .lean();
  if (!category) {
    throw ApiError.notFound(`No ${kind} called "${slug}"`, { code: ERROR_CODES.NOT_FOUND });
  }

  const filter = { ...publishedFilter(catalog), [TRACK_FIELD[kind]]: slug };
  const order =
    sort === "new" ? { publishedAt: -1, _id: -1 } : { playCount: -1, publishedAt: -1, _id: -1 };
  const [items, total] = await Promise.all([
    Track.find(filter)
      .sort(order)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("artistId", ARTIST_REF_FIELDS)
      .lean(),
    Track.countDocuments(filter),
  ]);
  const { _id, ...publicCategory } = category;
  return { category: { ...publicCategory, kind }, items, meta: buildPageMeta(total, page, limit) };
}

/**
 * Trending song ids and their recent play counts, cached per catalog.
 * @param {string} catalog
 * @returns {Promise<Array<{ id: string, plays: number }>>}
 */
function trendingIds(catalog) {
  return remember(`browse:trending:${catalog}`, TRENDING_CACHE_SECONDS, async () => {
    const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await ListenEvent.aggregate([
      { $match: { createdAt: { $gte: since }, type: { $in: ["play", "repeat"] } } },
      // Each listener counts once per song per day, so one person on repeat can't game it
      {
        $group: {
          _id: {
            trackId: "$trackId",
            userId: "$userId",
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
        },
      },
      { $group: { _id: "$_id.trackId", plays: { $sum: 1 } } },
      { $sort: { plays: -1 } },
      { $limit: TRENDING_MAX * 3 },
      {
        $lookup: {
          from: Track.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "track",
          pipeline: [{ $match: publishedFilter(catalog) }, { $project: { _id: 1 } }],
        },
      },
      { $match: { "track.0": { $exists: true } } },
      { $limit: TRENDING_MAX },
    ]);
    return rows.map((row) => ({ id: String(row._id), plays: row.plays }));
  });
}

/**
 * Trending: most played in the last 7 days. Quiet weeks are topped up with
 * the all-time most played songs, so the row is never empty on a new install.
 * @param {{ catalog?: string, limit?: number }} [options]
 * @returns {Promise<Array<{ track: Object, plays: number }>>}
 */
export async function getTrending({ catalog = "all", limit = 20 } = {}) {
  const ranked = (await trendingIds(catalog)).slice(0, limit);
  const tracks = ranked.length
    ? await Track.find({
        _id: { $in: ranked.map((entry) => entry.id) },
        ...publishedFilter(catalog),
      })
        .populate("artistId", ARTIST_REF_FIELDS)
        .lean()
    : [];
  const byId = new Map(tracks.map((track) => [String(track._id), track]));
  const results = ranked
    .filter((entry) => byId.has(entry.id))
    .map((entry) => ({ track: byId.get(entry.id), plays: entry.plays }));

  if (results.length < limit) {
    const topUp = await Track.find({ ...publishedFilter(catalog), _id: { $nin: [...byId.keys()] } })
      .sort({ playCount: -1, publishedAt: -1 })
      .limit(limit - results.length)
      .populate("artistId", ARTIST_REF_FIELDS)
      .lean();
    results.push(...topUp.map((track) => ({ track, plays: 0 })));
  }
  return results;
}

/**
 * New Releases: newest published songs.
 * @param {{ catalog?: string, page?: number, limit?: number }} [options]
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function getNewReleases({ catalog = "all", page = 1, limit = BROWSE_PAGE_SIZE } = {}) {
  const filter = publishedFilter(catalog);
  const [items, total] = await Promise.all([
    Track.find(filter)
      .sort({ publishedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("artistId", ARTIST_REF_FIELDS)
      .lean(),
    Track.countDocuments(filter),
  ]);
  return { items, meta: buildPageMeta(total, page, limit) };
}
