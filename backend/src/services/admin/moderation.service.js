/**
 * Moderation queue (PRD 10.9.2 Moderation, roadmap Day 9): reports are grouped
 * per reported item (song, comment or artist) with a preview, and staff can
 * dismiss them, take the item down, warn whoever posted it, or restore it.
 * - take down: song → "taken_down"; comment → hidden; artist → all their
 *   published songs taken down
 * - restore: the reverse
 * - warn: a warning on the uploader's / commenter's account plus an email
 */
import mongoose from "mongoose";
import { Report } from "../../models/report.model.js";
import { Track } from "../../models/track.model.js";
import { Comment } from "../../models/comment.model.js";
import { ArtistProfile } from "../../models/artistProfile.model.js";
import { User } from "../../models/user.model.js";
import { sendEmail } from "../email.service.js";
import { moderationWarningEmail } from "../../utils/emailTemplates.js";
import { buildPageMeta } from "../../helpers/genericFunctions.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { ERROR_CODES } from "../../config/constants.js";
import { logger } from "../../utils/logger.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified userId";

/**
 * Preview data for reported items, keyed "type:id".
 * @param {Array<{ targetType: string, targetId: Object }>} targets
 * @returns {Promise<Map<string, Object>>}
 */
async function loadPreviews(targets) {
  const idsOf = (type) => targets.filter((t) => t.targetType === type).map((t) => t.targetId);
  const [tracks, comments, artists] = await Promise.all([
    Track.find({ _id: { $in: idsOf("track") } })
      .select("title coverUrl status catalog artistId uploadedBy audio.durationSec")
      .populate("artistId", ARTIST_REF_FIELDS)
      .lean(),
    Comment.find({ _id: { $in: idsOf("comment") } })
      .populate("userId", "name avatar")
      .populate("trackId", "title")
      .lean(),
    ArtistProfile.find({ _id: { $in: idsOf("artist") } }).lean(),
  ]);
  const previews = new Map();
  for (const track of tracks) {
    previews.set(`track:${track._id}`, {
      title: track.title,
      subtitle: track.artistId?.stageName ?? "",
      imageUrl: track.coverUrl ?? null,
      status: track.status,
      catalog: track.catalog,
      durationSec: track.audio?.durationSec ?? 0,
      isTakenDown: track.status === "taken_down",
    });
  }
  for (const comment of comments) {
    previews.set(`comment:${comment._id}`, {
      title: comment.body,
      subtitle: `${comment.userId?.name ?? "Someone"} on ${comment.trackId?.title ?? "a song"}`,
      imageUrl: comment.userId?.avatar ?? null,
      status: comment.status,
      trackId: comment.trackId ? String(comment.trackId._id) : null,
      isTakenDown: comment.status !== "visible",
    });
  }
  for (const artist of artists) {
    previews.set(`artist:${artist._id}`, {
      title: artist.stageName,
      subtitle: artist.userId ? "Creator" : "Official artist",
      imageUrl: artist.avatar ?? null,
      status: artist.verified ? "verified" : "unverified",
      slug: artist.slug ?? null,
      isTakenDown: false,
    });
  }
  return previews;
}

/**
 * Reports grouped by item, most reported first.
 * @param {{ status?: "open"|"dismissed"|"actioned", targetType?: string, page: number, limit: number }} query
 * @returns {Promise<{ items: Object[], meta: Object, openCount: number }>}
 */
export async function listReportGroups({ status = "open", targetType, page = 1, limit = 20 }) {
  const match = { status, ...(targetType && { targetType }) };
  const [groups, [{ total = 0 } = {}], openCount] = await Promise.all([
    Report.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { targetType: "$targetType", targetId: "$targetId" },
          count: { $sum: 1 },
          reasons: { $push: "$reason" },
          details: {
            $push: { $cond: [{ $gt: [{ $strLenCP: "$details" }, 0] }, "$details", "$$REMOVE"] },
          },
          firstAt: { $min: "$createdAt" },
          lastAt: { $max: "$createdAt" },
          resolvedAt: { $max: "$resolvedAt" },
        },
      },
      { $sort: { count: -1, lastAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]),
    Report.aggregate([
      { $match: match },
      { $group: { _id: { targetType: "$targetType", targetId: "$targetId" } } },
      { $count: "total" },
    ]),
    Report.countDocuments({ status: "open" }),
  ]);
  const previews = await loadPreviews(groups.map((group) => group._id));
  return {
    items: groups.map((group) => {
      const reasons = group.reasons.reduce(
        (tally, reason) => ({ ...tally, [reason]: (tally[reason] ?? 0) + 1 }),
        {}
      );
      return {
        targetType: group._id.targetType,
        targetId: String(group._id.targetId),
        reportCount: group.count,
        reasons,
        details: group.details.slice(0, 5),
        firstReportedAt: group.firstAt,
        lastReportedAt: group.lastAt,
        resolvedAt: group.resolvedAt ?? null,
        preview: previews.get(`${group._id.targetType}:${group._id.targetId}`) ?? null, // null = deleted
      };
    }),
    meta: buildPageMeta(total, page, limit),
    openCount,
  };
}

/**
 * Close the open reports for an item.
 * @param {string} targetType
 * @param {string} targetId
 * @param {"dismissed"|"actioned"} status
 * @param {string} staffId
 * @returns {Promise<number>} Reports closed
 */
async function closeReports(targetType, targetId, status, staffId) {
  const result = await Report.updateMany(
    { targetType, targetId: new mongoose.Types.ObjectId(targetId), status: "open" },
    { $set: { status, resolvedBy: staffId, resolvedAt: new Date() } }
  );
  return result.modifiedCount;
}

/**
 * Take an item down (true) or restore it (false).
 * @param {string} targetType
 * @param {string} targetId
 * @param {boolean} down
 * @returns {Promise<{ before: Object, after: Object }>}
 */
async function setTakenDown(targetType, targetId, down) {
  if (targetType === "track") {
    const track = await Track.findById(targetId);
    if (!track) throw ApiError.notFound("Song not found", { code: ERROR_CODES.NOT_FOUND });
    const before = { status: track.status };
    if (down) {
      if (track.status === "taken_down") return { before, after: before };
      track.status = "taken_down";
    } else {
      if (track.status !== "taken_down") return { before, after: before };
      track.status = "published";
      track.publishedAt ??= new Date();
    }
    await track.save();
    return { before, after: { status: track.status } };
  }
  if (targetType === "comment") {
    const comment = await Comment.findById(targetId);
    if (!comment) throw ApiError.notFound("Comment not found", { code: ERROR_CODES.NOT_FOUND });
    const before = { status: comment.status };
    if (comment.status !== "removed") comment.status = down ? "hidden" : "visible";
    await comment.save();
    return { before, after: { status: comment.status } };
  }
  // Artist: every published song (or every taken-down song when restoring)
  const artist = await ArtistProfile.findById(targetId).lean();
  if (!artist) throw ApiError.notFound("Artist not found", { code: ERROR_CODES.NOT_FOUND });
  const from = down ? "published" : "taken_down";
  const to = down ? "taken_down" : "published";
  const result = await Track.updateMany(
    { artistId: artist._id, status: from },
    { $set: { status: to } }
  );
  return { before: { songs: from }, after: { songs: to, changed: result.modifiedCount } };
}

/**
 * Who is responsible for an item (to warn them), or null for staff / official content.
 * @param {string} targetType
 * @param {string} targetId
 * @returns {Promise<{ user: Object, what: string }|null>}
 */
async function responsibleUser(targetType, targetId) {
  let userId = null;
  let what = "";
  if (targetType === "track") {
    const track = await Track.findById(targetId).select("title uploadedBy addedVia").lean();
    if (track?.addedVia === "admin") return null;
    userId = track?.uploadedBy;
    what = `your song "${track?.title}"`;
  } else if (targetType === "comment") {
    const comment = await Comment.findById(targetId).select("userId").lean();
    userId = comment?.userId;
    what = "one of your comments";
  } else {
    const artist = await ArtistProfile.findById(targetId).select("userId stageName").lean();
    userId = artist?.userId;
    what = `your artist profile "${artist?.stageName}"`;
  }
  if (!userId) return null;
  const user = await User.findById(userId);
  if (!user || user.staffRole) return null;
  return { user, what };
}

/**
 * Act on a reported item.
 * @param {{ targetType: string, targetId: string, action: "dismiss"|"takeDown"|"warn"|"restore", note?: string }} input
 * @param {string} staffId
 * @returns {Promise<{ action: string, reportsClosed: number, before: Object|null, after: Object|null }>}
 */
export async function moderate({ targetType, targetId, action, note = "" }, staffId) {
  if (action === "dismiss") {
    const reportsClosed = await closeReports(targetType, targetId, "dismissed", staffId);
    return { action, reportsClosed, before: null, after: null };
  }
  if (action === "takeDown" || action === "restore") {
    const change = await setTakenDown(targetType, targetId, action === "takeDown");
    const reportsClosed =
      action === "takeDown" ? await closeReports(targetType, targetId, "actioned", staffId) : 0;
    logger.info(`[Moderation] ${action} ${targetType}=${targetId} by staffId=${staffId}`);
    return { action, reportsClosed, ...change };
  }
  // Warn the uploader / commenter
  const responsible = await responsibleUser(targetType, targetId);
  if (!responsible) {
    throw ApiError.badRequest("There is no listener or creator account to warn for this item");
  }
  const reasons = await Report.find({ targetType, targetId, status: "open" }).distinct("reason");
  const reason = note || reasons.join(", ") || "community rules";
  responsible.user.warnings.push({ reason: reason.slice(0, 200), by: staffId, at: new Date() });
  await responsible.user.save();
  sendEmail({
    to: responsible.user.email,
    ...moderationWarningEmail({
      name: responsible.user.name,
      what: responsible.what,
      reason,
      appUrl: env.appUrl,
    }),
  }).catch((error) => logger.warn(`[Moderation] warning email failed: ${error.message}`));
  const reportsClosed = await closeReports(targetType, targetId, "actioned", staffId);
  return {
    action,
    reportsClosed,
    before: null,
    after: {
      warnedUserId: String(responsible.user._id),
      warnings: responsible.user.warnings.length,
    },
  };
}
