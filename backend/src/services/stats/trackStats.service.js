/**
 * Song statistics (PRD PRF-1/2/3/4, roadmap Day 9).
 * - computeDailyStats(): the hourly job — listenEvents, likes, playlist saves,
 *   shares (Day 10) and comments → one trackDailyStats row per song per day
 * - summariseStats(): pure totals / rates from daily rows (unit tested)
 * - statsByTrack(): totals per song for a date range (performance lists, creators)
 * - dailySeries(): one song's (or a set of songs') day-by-day numbers
 */
import mongoose from "mongoose";
import { ListenEvent } from "../../models/listenEvent.model.js";
import { Like } from "../../models/like.model.js";
import { Playlist } from "../../models/playlist.model.js";
import { Comment } from "../../models/comment.model.js";
import { ShareEvent } from "../../models/shareEvent.model.js";
import { TrackDailyStats } from "../../models/trackDailyStats.model.js";
import { lastZonedDays, startOfZonedDay } from "../../utils/dates.js";
import { STATS_RECOMPUTE_DAYS, STATS_TIMEZONE } from "../../config/constants.js";
import { logger } from "../../utils/logger.js";

const PLAYISH = ["play", "repeat"];

/**
 * Empty counters for one song-day.
 * @returns {Object}
 */
function emptyDay() {
  return {
    plays: 0,
    uniqueListeners: 0,
    listenPctSum: 0,
    listenPctCount: 0,
    completes: 0,
    skips: 0,
    likes: 0,
    saves: 0,
    shares: 0,
    comments: 0,
    sources: {},
    devices: {},
  };
}

/**
 * Count something per song per day with an aggregation.
 * @param {mongoose.Model} Model
 * @param {Object[]} pipeline - Must end grouped by { trackId, date } with a `count`
 * @returns {Promise<Array<{ _id: { trackId: Object, date: string }, count: number }>>}
 */
function countPerDay(Model, pipeline) {
  return Model.aggregate(pipeline);
}

/** $dateToString in the stats time zone. */
const dayOf = (field) => ({
  $dateToString: { format: "%Y-%m-%d", date: field, timezone: STATS_TIMEZONE },
});

/**
 * Hourly job (PRF-1): recount the last few days for every song with activity.
 * Whole days are recounted, so running it twice gives the same result.
 * @param {{ days?: number }} [options]
 * @returns {Promise<{ days: string[], rows: number }>}
 */
export async function computeDailyStats({ days = STATS_RECOMPUTE_DAYS } = {}) {
  const dayList = lastZonedDays(days, STATS_TIMEZONE);
  const since = startOfZonedDay(dayList[0], STATS_TIMEZONE);

  const [listens, likes, saves, comments, shares] = await Promise.all([
    ListenEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { trackId: "$trackId", date: dayOf("$createdAt") },
          plays: { $sum: { $cond: [{ $in: ["$type", PLAYISH] }, 1, 0] } },
          completes: { $sum: { $cond: [{ $eq: ["$type", "complete"] }, 1, 0] } },
          skips: { $sum: { $cond: [{ $eq: ["$type", "skip"] }, 1, 0] } },
          listeners: { $addToSet: { $cond: [{ $in: ["$type", PLAYISH] }, "$userId", "$$REMOVE"] } },
          listenPctSum: {
            $sum: {
              $cond: [
                { $and: [{ $in: ["$type", PLAYISH] }, { $gt: ["$percent", 0] }] },
                "$percent",
                0,
              ],
            },
          },
          listenPctCount: {
            $sum: {
              $cond: [{ $and: [{ $in: ["$type", PLAYISH] }, { $gt: ["$percent", 0] }] }, 1, 0],
            },
          },
          sources: {
            $push: {
              $cond: [
                { $in: ["$type", PLAYISH] },
                { $ifNull: ["$context.source", "other"] },
                "$$REMOVE",
              ],
            },
          },
          devices: {
            $push: {
              $cond: [
                { $in: ["$type", PLAYISH] },
                { $ifNull: ["$context.device", "unknown"] },
                "$$REMOVE",
              ],
            },
          },
        },
      },
    ]),
    countPerDay(Like, [
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { trackId: "$trackId", date: dayOf("$createdAt") }, count: { $sum: 1 } } },
    ]),
    countPerDay(Playlist, [
      { $match: { "tracks.addedAt": { $gte: since } } },
      { $unwind: "$tracks" },
      { $match: { "tracks.addedAt": { $gte: since } } },
      {
        $group: {
          _id: { trackId: "$tracks.trackId", date: dayOf("$tracks.addedAt") },
          count: { $sum: 1 },
        },
      },
    ]),
    countPerDay(Comment, [
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { trackId: "$trackId", date: dayOf("$createdAt") }, count: { $sum: 1 } } },
    ]),
    countPerDay(ShareEvent, [
      { $match: { targetType: "track", createdAt: { $gte: since } } },
      { $group: { _id: { trackId: "$targetId", date: dayOf("$createdAt") }, count: { $sum: 1 } } },
    ]),
  ]);

  const rows = new Map(); // "trackId|date" → counters
  const rowFor = ({ trackId, date }) => {
    const key = `${trackId}|${date}`;
    if (!rows.has(key)) rows.set(key, { trackId, date, ...emptyDay() });
    return rows.get(key);
  };
  const tally = (list) =>
    list.reduce((counts, value) => ({ ...counts, [value]: (counts[value] ?? 0) + 1 }), {});

  for (const entry of listens) {
    Object.assign(rowFor(entry._id), {
      plays: entry.plays,
      completes: entry.completes,
      skips: entry.skips,
      uniqueListeners: entry.listeners.length,
      listenPctSum: entry.listenPctSum,
      listenPctCount: entry.listenPctCount,
      sources: tally(entry.sources),
      devices: tally(entry.devices),
    });
  }
  likes.forEach((entry) => (rowFor(entry._id).likes = entry.count));
  saves.forEach((entry) => (rowFor(entry._id).saves = entry.count));
  comments.forEach((entry) => (rowFor(entry._id).comments = entry.count));
  shares.forEach((entry) => (rowFor(entry._id).shares = entry.count));

  if (rows.size > 0) {
    await TrackDailyStats.bulkWrite(
      [...rows.values()].map(({ trackId, date, ...counters }) => ({
        updateOne: { filter: { trackId, date }, update: { $set: counters }, upsert: true },
      })),
      { ordered: false }
    );
  }
  logger.debug(`[TrackStats] ${rows.size} song-day rows for ${dayList.join(", ")}`);
  return { days: dayList, rows: rows.size };
}

/**
 * Totals and rates from daily rows (pure — unit tested).
 * @param {Array<Object>} rows - trackDailyStats-like counters
 * @returns {{ plays: number, listeners: number, completes: number, skips: number, likes: number, saves: number, shares: number, comments: number, avgListenPct: number|null, completionRate: number|null, skipRate: number|null }}
 */
export function summariseStats(rows) {
  const total = rows.reduce(
    (sum, row) => ({
      plays: sum.plays + (row.plays ?? 0),
      listeners: sum.listeners + (row.uniqueListeners ?? 0),
      completes: sum.completes + (row.completes ?? 0),
      skips: sum.skips + (row.skips ?? 0),
      likes: sum.likes + (row.likes ?? 0),
      saves: sum.saves + (row.saves ?? 0),
      shares: sum.shares + (row.shares ?? 0),
      comments: sum.comments + (row.comments ?? 0),
      pctSum: sum.pctSum + (row.listenPctSum ?? 0),
      pctCount: sum.pctCount + (row.listenPctCount ?? 0),
    }),
    {
      plays: 0,
      listeners: 0,
      completes: 0,
      skips: 0,
      likes: 0,
      saves: 0,
      shares: 0,
      comments: 0,
      pctSum: 0,
      pctCount: 0,
    }
  );
  const { pctSum, pctCount, ...counts } = total;
  const rate = (part) => (total.plays > 0 ? Math.min(1, part / total.plays) : null);
  return {
    ...counts,
    avgListenPct: pctCount > 0 ? pctSum / pctCount : null,
    completionRate: rate(total.completes),
    skipRate: rate(total.skips),
  };
}

/**
 * The first day of a range ("last N days"; 0 = all time).
 * @param {number} rangeDays
 * @returns {string|null} "YYYY-MM-DD" or null for all time
 */
export function rangeStart(rangeDays) {
  return rangeDays > 0 ? lastZonedDays(rangeDays, STATS_TIMEZONE)[0] : null;
}

/**
 * Raw daily sums per song for a range (summarise them with summariseStats;
 * several songs can be summed by passing their raw rows together).
 * @param {{ rangeDays: number, trackIds?: Array<string|Object> }} options
 * @returns {Promise<Map<string, Object>>}
 */
export async function rawStatsByTrack({ rangeDays, trackIds }) {
  const from = rangeStart(rangeDays);
  const match = {
    ...(from && { date: { $gte: from } }),
    ...(trackIds && {
      trackId: { $in: trackIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
    }),
  };
  const groups = await TrackDailyStats.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$trackId",
        plays: { $sum: "$plays" },
        uniqueListeners: { $sum: "$uniqueListeners" },
        completes: { $sum: "$completes" },
        skips: { $sum: "$skips" },
        likes: { $sum: "$likes" },
        saves: { $sum: "$saves" },
        shares: { $sum: "$shares" },
        comments: { $sum: "$comments" },
        listenPctSum: { $sum: "$listenPctSum" },
        listenPctCount: { $sum: "$listenPctCount" },
      },
    },
  ]);
  return new Map(groups.map((group) => [String(group._id), group]));
}

/**
 * Totals per song for a range.
 * @param {{ rangeDays: number, trackIds?: Array<string|Object> }} options
 * @returns {Promise<Map<string, ReturnType<typeof summariseStats>>>}
 */
export async function statsByTrack(options) {
  const raw = await rawStatsByTrack(options);
  return new Map([...raw].map(([id, group]) => [id, summariseStats([group])]));
}

/**
 * Day-by-day numbers for one or more songs (missing days are zero).
 * @param {{ trackIds: Array<string|Object>, rangeDays: number }} options - rangeDays 0 → last 365 days
 * @returns {Promise<{ series: Array<Object>, sources: Object, devices: Object, rows: Object[] }>}
 */
export async function dailySeries({ trackIds, rangeDays }) {
  const days = lastZonedDays(rangeDays > 0 ? rangeDays : 365, STATS_TIMEZONE);
  const rows = await TrackDailyStats.find({
    trackId: { $in: trackIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
    date: { $gte: days[0] },
  }).lean();
  const byDay = new Map();
  const sources = {};
  const devices = {};
  for (const row of rows) {
    const day = byDay.get(row.date) ?? emptyDay();
    for (const field of [
      "plays",
      "uniqueListeners",
      "completes",
      "skips",
      "likes",
      "saves",
      "shares",
      "comments",
      "listenPctSum",
      "listenPctCount",
    ]) {
      day[field] += row[field] ?? 0;
    }
    byDay.set(row.date, day);
    for (const [key, count] of Object.entries(row.sources ?? {}))
      sources[key] = (sources[key] ?? 0) + count;
    for (const [key, count] of Object.entries(row.devices ?? {}))
      devices[key] = (devices[key] ?? 0) + count;
  }
  // All time: start the chart at the first day with data
  const firstWithData =
    rangeDays > 0
      ? 0
      : Math.max(
          0,
          days.findIndex((day) => byDay.has(day))
        );
  const series = days.slice(firstWithData).map((date) => {
    const day = byDay.get(date) ?? emptyDay();
    return {
      date,
      plays: day.plays,
      listeners: day.uniqueListeners,
      completes: day.completes,
      skips: day.skips,
      likes: day.likes,
      saves: day.saves,
      comments: day.comments,
    };
  });
  return { series, sources, devices, rows };
}

/**
 * Exact unique listeners for some songs over a range (listen events are kept 180 days).
 * @param {{ trackIds: Array<string|Object>, rangeDays: number }} options
 * @returns {Promise<number>}
 */
export async function countUniqueListeners({ trackIds, rangeDays }) {
  const from = rangeStart(rangeDays);
  const [result] = await ListenEvent.aggregate([
    {
      $match: {
        trackId: { $in: trackIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
        type: { $in: PLAYISH },
        ...(from && { createdAt: { $gte: startOfZonedDay(from, STATS_TIMEZONE) } }),
      },
    },
    { $group: { _id: "$userId" } },
    { $count: "listeners" },
  ]);
  return result?.listeners ?? 0;
}
