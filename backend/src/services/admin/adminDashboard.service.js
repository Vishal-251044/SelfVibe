/**
 * Admin Dashboard numbers (PRD 10.9.2 Dashboard, roadmap Day 9 /admin/stats):
 * users, new sign-ups, DAU / MAU, plays today, uploads, pending reports,
 * verification requests, storage used and today's top songs. Days are
 * counted in STATS_TIMEZONE. Cached for a minute.
 */
import { User } from "../../models/user.model.js";
import { Track } from "../../models/track.model.js";
import { ListenEvent } from "../../models/listenEvent.model.js";
import { Report } from "../../models/report.model.js";
import { ArtistProfile } from "../../models/artistProfile.model.js";
import { StorageAccount } from "../../models/storageAccount.model.js";
import { TrackDailyStats } from "../../models/trackDailyStats.model.js";
import { remember } from "../cache.service.js";
import { usesStoragePool } from "../storage/index.js";
import { lastZonedDays, startOfZonedDay } from "../../utils/dates.js";
import { STATS_TIMEZONE } from "../../config/constants.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const ARTIST_REF_FIELDS = "stageName slug avatar verified";

/**
 * Distinct listeners since a moment.
 * @param {Date} since
 * @returns {Promise<number>}
 */
async function activeListeners(since) {
  const [result] = await ListenEvent.aggregate([
    { $match: { createdAt: { $gte: since }, type: { $in: ["play", "repeat"] } } },
    { $group: { _id: "$userId" } },
    { $count: "users" },
  ]);
  return result?.users ?? 0;
}

/**
 * Everything the dashboard shows.
 * @returns {Promise<Object>}
 */
export function getDashboardStats() {
  return remember("admin:dashboard", 60, async () => {
    const [today] = lastZonedDays(1, STATS_TIMEZONE);
    const startOfToday = startOfZonedDay(today, STATS_TIMEZONE);
    const weekAgo = new Date(Date.now() - 7 * DAY_MS);
    const monthAgo = new Date(Date.now() - 30 * DAY_MS);
    const last14 = lastZonedDays(14, STATS_TIMEZONE);

    const [
      users,
      creators,
      suspended,
      newToday,
      newThisWeek,
      dau,
      mau,
      playsToday,
      published,
      catalogSplit,
      uploadsToday,
      uploadsThisWeek,
      processing,
      openReports,
      verificationRequests,
      storage,
      playsByDay,
      topToday,
    ] = await Promise.all([
      User.countDocuments({ staffRole: null }),
      User.countDocuments({ roles: "creator" }),
      User.countDocuments({ status: "suspended" }),
      User.countDocuments({ staffRole: null, createdAt: { $gte: startOfToday } }),
      User.countDocuments({ staffRole: null, createdAt: { $gte: weekAgo } }),
      activeListeners(startOfToday),
      activeListeners(monthAgo),
      ListenEvent.countDocuments({
        createdAt: { $gte: startOfToday },
        type: { $in: ["play", "repeat"] },
      }),
      Track.countDocuments({ status: "published" }),
      Track.aggregate([
        { $match: { status: "published" } },
        { $group: { _id: "$catalog", count: { $sum: 1 } } },
      ]),
      Track.countDocuments({ createdAt: { $gte: startOfToday } }),
      Track.countDocuments({ createdAt: { $gte: weekAgo } }),
      Track.countDocuments({ status: "processing" }),
      Report.countDocuments({ status: "open" }),
      ArtistProfile.countDocuments({ "verification.status": "pending" }),
      usesStoragePool
        ? StorageAccount.aggregate([
            {
              $group: {
                _id: null,
                bytesUsed: { $sum: "$bytesUsed" },
                quotaBytes: { $sum: "$quotaBytes" },
                accounts: { $sum: 1 },
              },
            },
          ])
        : Track.aggregate([
            { $group: { _id: null, bytesUsed: { $sum: "$storage.bytes" }, accounts: { $sum: 0 } } },
          ]),
      TrackDailyStats.aggregate([
        { $match: { date: { $gte: last14[0] } } },
        { $group: { _id: "$date", plays: { $sum: "$plays" } } },
      ]),
      TrackDailyStats.find({ date: today, plays: { $gt: 0 } })
        .sort({ plays: -1 })
        .limit(5)
        .lean(),
    ]);

    const playsMap = new Map(playsByDay.map((row) => [row._id, row.plays]));
    const topTracks = await Track.find({ _id: { $in: topToday.map((row) => row.trackId) } })
      .select("title coverUrl catalog artistId")
      .populate("artistId", ARTIST_REF_FIELDS)
      .lean();
    const topById = new Map(topTracks.map((track) => [String(track._id), track]));

    return {
      generatedAt: new Date(),
      users: { total: users, creators, suspended, newToday, newThisWeek, dau, mau },
      plays: {
        today: playsToday,
        last14Days: last14.map((date) => ({ date, plays: playsMap.get(date) ?? 0 })),
      },
      catalog: {
        published,
        official: catalogSplit.find((row) => row._id === "official")?.count ?? 0,
        community: catalogSplit.find((row) => row._id === "community")?.count ?? 0,
        uploadsToday,
        uploadsThisWeek,
        processing,
      },
      moderation: { openReports, verificationRequests },
      storage: {
        usesPool: usesStoragePool,
        bytesUsed: storage[0]?.bytesUsed ?? 0,
        quotaBytes: storage[0]?.quotaBytes ?? null,
        accounts: storage[0]?.accounts ?? 0,
      },
      topTracksToday: topToday
        .filter((row) => topById.has(String(row.trackId)))
        .map((row) => {
          const track = topById.get(String(row.trackId));
          return {
            id: String(track._id),
            title: track.title,
            coverUrl: track.coverUrl ?? null,
            catalog: track.catalog,
            artist: track.artistId?.stageName ?? null,
            plays: row.plays,
          };
        }),
    };
  });
}
