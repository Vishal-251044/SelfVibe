/**
 * Song performance (PRD 10.15.2, PRF-2/3, roadmap Day 9):
 * - listPerformance(): every song (Official / Community / AI filter) with
 *   plays, listeners, completion, skips, likes, saves, shares and comments
 *   for a date range; sortable (top 50 / bottom 50); Official vs Community totals
 * - getTrackPerformance(): one song — day-by-day chart, rates, exact unique
 *   listeners, sources, devices, latest comments and reports
 * - CSV exports for the catalog and for one song
 * Numbers come from trackDailyStats (hourly job), so pages load fast.
 */
import mongoose from "mongoose";
import { Track } from "../../models/track.model.js";
import { Report } from "../../models/report.model.js";
import { Playlist } from "../../models/playlist.model.js";
import {
  countUniqueListeners,
  dailySeries,
  rawStatsByTrack,
  summariseStats,
} from "../stats/trackStats.service.js";
import { listAdminComments } from "./adminComments.service.js";
import { toManagedTrack } from "../track.serializer.js";
import { buildPageMeta, toCsv } from "../../helpers/genericFunctions.js";
import { ApiError } from "../../utils/ApiError.js";
import { ERROR_CODES } from "../../config/constants.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified";
const LIST_FIELDS =
  "title artistId catalog source status coverUrl publishedAt likeCount playCount audio.durationSec";
const EMPTY = summariseStats([]);

/**
 * Mongo filter for the Official / Community / AI switch and title search.
 * @param {{ catalog?: string, q?: string }} options
 * @returns {Object}
 */
function songFilter({ catalog = "all", q }) {
  return {
    status: { $nin: ["processing", "rejected"] },
    ...(catalog === "official" && { catalog: "official", source: { $ne: "ai" } }),
    ...(catalog === "community" && { catalog: "community", source: { $ne: "ai" } }),
    ...(catalog === "ai" && { source: "ai" }),
    ...(q && { title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }),
  };
}

/**
 * List row for one song.
 * @param {Object} track - Lean, artist populated
 * @param {Object} stats - summariseStats shape
 * @returns {Object}
 */
function toPerformanceRow(track, stats) {
  return {
    id: String(track._id),
    title: track.title,
    artist: track.artistId?.stageName ?? null,
    artistId: track.artistId?._id ? String(track.artistId._id) : null,
    coverUrl: track.coverUrl ?? null,
    catalog: track.catalog,
    source: track.source,
    status: track.status,
    publishedAt: track.publishedAt ?? null,
    durationSec: track.audio?.durationSec ?? 0,
    totalPlays: track.playCount ?? 0,
    totalLikes: track.likeCount ?? 0,
    ...stats,
  };
}

/**
 * Every song with its numbers for a range (sorted and paged in memory —
 * fine for the PRD's ~5,000-song catalog).
 * @param {{ rangeDays: number, catalog?: string, q?: string }} options
 * @returns {Promise<Object[]>}
 */
async function performanceRows({ rangeDays, catalog, q }) {
  const [tracks, raw] = await Promise.all([
    Track.find(songFilter({ catalog, q }))
      .select(LIST_FIELDS)
      .populate("artistId", ARTIST_REF_FIELDS)
      .lean(),
    rawStatsByTrack({ rangeDays }),
  ]);
  return tracks.map((track) => {
    const sums = raw.get(String(track._id)) ?? null;
    // `raw` stays server-side: group totals are summed from it
    return { ...toPerformanceRow(track, sums ? summariseStats([sums]) : EMPTY), raw: sums };
  });
}

/**
 * Sort rows by a column (nulls last).
 * @param {Object[]} rows
 * @param {string} sort
 * @param {"asc"|"desc"} order
 * @returns {Object[]}
 */
function sortRows(rows, sort, order) {
  const direction = order === "asc" ? 1 : -1;
  const value = (row) =>
    sort === "listeners"
      ? row.listeners
      : sort === "publishedAt"
        ? new Date(row.publishedAt ?? 0).getTime()
        : row[sort];
  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    return (left - right) * direction || a.title.localeCompare(b.title);
  });
}

/**
 * Song performance list.
 * @param {{ rangeDays: number, catalog?: string, q?: string, sort: string, order: "asc"|"desc", page: number, limit: number }} query
 * @returns {Promise<{ items: Object[], meta: Object, summary: Object }>}
 */
export async function listPerformance({
  rangeDays,
  catalog = "all",
  q,
  sort = "plays",
  order = "desc",
  page = 1,
  limit = 50,
}) {
  const rows = await performanceRows({ rangeDays, catalog, q });
  const sorted = sortRows(rows, sort, order);
  // PRF-2: Official vs Community
  const totalsFor = (filter) => {
    const group = rows.filter(filter);
    return { songs: group.length, ...summariseStats(group.map((row) => row.raw).filter(Boolean)) };
  };
  return {
    items: sorted.slice((page - 1) * limit, page * limit).map(({ raw, ...row }) => row),
    meta: buildPageMeta(rows.length, page, limit),
    summary: {
      all: totalsFor(() => true),
      official: totalsFor((row) => row.catalog === "official" && row.source !== "ai"),
      community: totalsFor((row) => row.catalog === "community" && row.source !== "ai"),
      ai: totalsFor((row) => row.source === "ai"),
    },
  };
}

/**
 * One song's full performance.
 * @param {string} trackId
 * @param {{ rangeDays: number }} options
 * @returns {Promise<Object>}
 * @throws {ApiError} 404
 */
export async function getTrackPerformance(trackId, { rangeDays }) {
  const track = await Track.findById(trackId).populate("artistId", ARTIST_REF_FIELDS).lean();
  if (!track) throw ApiError.notFound("Song not found", { code: ERROR_CODES.NOT_FOUND });
  const id = new mongoose.Types.ObjectId(String(trackId));

  const [{ series, sources, devices, rows }, listeners, savesTotal, comments, reports] =
    await Promise.all([
      dailySeries({ trackIds: [id], rangeDays }),
      countUniqueListeners({ trackIds: [id], rangeDays }),
      Playlist.countDocuments({ "tracks.trackId": id }),
      listAdminComments({ trackId: String(id), page: 1, limit: 10 }),
      Report.find({ targetType: "track", targetId: id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("reporterId", "name")
        .lean(),
    ]);
  const totals = summariseStats(rows);
  return {
    track: toManagedTrack(track),
    rangeDays,
    totals: { ...totals, listeners }, // exact distinct listeners over the range
    allTime: { plays: track.playCount ?? 0, likes: track.likeCount ?? 0, saves: savesTotal },
    series,
    sources,
    devices,
    comments: { items: comments.items, total: comments.meta.total },
    reports: reports.map((report) => ({
      id: String(report._id),
      reason: report.reason,
      details: report.details,
      status: report.status,
      reporter: report.reporterId?.name ?? null,
      createdAt: report.createdAt,
    })),
  };
}

const CATALOG_COLUMNS = [
  { key: "id", label: "Song ID" },
  { key: "title", label: "Title" },
  { key: "artist", label: "Artist" },
  { key: "catalog", label: "Catalog" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
  { key: "publishedAt", label: "Published" },
  { key: "plays", label: "Plays" },
  { key: "listeners", label: "Listeners (daily sum)" },
  { key: "avgListenPctText", label: "Avg listened %" },
  { key: "completionRateText", label: "Completion %" },
  { key: "skipRateText", label: "Skip %" },
  { key: "likes", label: "Likes" },
  { key: "saves", label: "Saves" },
  { key: "shares", label: "Shares" },
  { key: "comments", label: "Comments" },
  { key: "totalPlays", label: "All-time plays" },
];

/** @param {number|null} rate @returns {string} */
const percentText = (rate) => (rate === null || rate === undefined ? "" : (rate * 100).toFixed(1));

/**
 * The whole catalog's numbers as CSV (PRF-3).
 * @param {{ rangeDays: number, catalog?: string, q?: string }} options
 * @returns {Promise<string>}
 */
export async function exportCatalogCsv(options) {
  const rows = sortRows(await performanceRows(options), "plays", "desc").map((row) => ({
    ...row,
    avgListenPctText: row.avgListenPct === null ? "" : row.avgListenPct.toFixed(1),
    completionRateText: percentText(row.completionRate),
    skipRateText: percentText(row.skipRate),
  }));
  return toCsv(rows, CATALOG_COLUMNS);
}

/**
 * One song's day-by-day numbers as CSV (PRF-3).
 * @param {string} trackId
 * @param {{ rangeDays: number }} options
 * @returns {Promise<{ filename: string, csv: string }>}
 */
export async function exportTrackCsv(trackId, { rangeDays }) {
  const track = await Track.findById(trackId).select("title").lean();
  if (!track) throw ApiError.notFound("Song not found", { code: ERROR_CODES.NOT_FOUND });
  const { series } = await dailySeries({ trackIds: [trackId], rangeDays });
  const csv = toCsv(series, [
    { key: "date", label: "Date" },
    { key: "plays", label: "Plays" },
    { key: "listeners", label: "Listeners" },
    { key: "completes", label: "Completes" },
    { key: "skips", label: "Skips" },
    { key: "likes", label: "Likes" },
    { key: "saves", label: "Saves" },
    { key: "comments", label: "Comments" },
  ]);
  const slug =
    track.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "song";
  return { filename: `selfvibe-${slug}-stats.csv`, csv };
}
