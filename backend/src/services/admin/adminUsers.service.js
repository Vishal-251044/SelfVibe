/**
 * Admin Users & Creators (PRD 10.9.2, roadmap Day 9): search users, see their
 * activity, suspend / reactivate, give or remove the creator role, verify
 * artists, send a password reset, and review creators' verification requests.
 * Staff accounts are managed only in Team (Owner) — never here (PRD ADL-8).
 */
import mongoose from "mongoose";
import { User } from "../../models/user.model.js";
import { ArtistProfile } from "../../models/artistProfile.model.js";
import { Track } from "../../models/track.model.js";
import { ListenEvent } from "../../models/listenEvent.model.js";
import { Like } from "../../models/like.model.js";
import { Playlist } from "../../models/playlist.model.js";
import { Comment } from "../../models/comment.model.js";
import { Report } from "../../models/report.model.js";
import { revokeAllSessionsForUser } from "../session.service.js";
import { requestPasswordReset } from "../passwordReset.service.js";
import { buildPageMeta } from "../../helpers/genericFunctions.js";
import { ApiError } from "../../utils/ApiError.js";
import { ERROR_CODES } from "../../config/constants.js";
import { logger } from "../../utils/logger.js";

const USER_FIELDS =
  "name email avatar roles staffRole status plan emailVerified createdAt lastLoginAt warnings";
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Escape text for a case-insensitive "contains" regex.
 * @param {string} text
 * @returns {RegExp}
 */
function containsRegex(text) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/**
 * Staff view of a user (with their artist profile, if any).
 * @param {Object} user - Lean user
 * @param {Object|null} artist - Lean artist profile
 * @returns {Object}
 */
export function toAdminUser(user, artist = null) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? null,
    roles: user.roles ?? [],
    staffRole: user.staffRole ?? null,
    status: user.status,
    plan: user.plan,
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
    warningsCount: user.warnings?.length ?? 0,
    artist: artist
      ? {
          id: String(artist._id),
          stageName: artist.stageName,
          slug: artist.slug ?? null,
          verified: Boolean(artist.verified),
          verificationStatus: artist.verification?.status ?? "none",
        }
      : null,
  };
}

/**
 * Search users.
 * @param {{ q?: string, filter?: "all"|"listeners"|"creators"|"suspended"|"verification", page: number, limit: number }} query
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function listUsers({ q, filter = "all", page = 1, limit = 25 }) {
  const where = { staffRole: null };
  if (q) where.$or = [{ name: containsRegex(q) }, { email: containsRegex(q) }];
  if (filter === "listeners") where.roles = { $ne: "creator" };
  if (filter === "creators") where.roles = "creator";
  if (filter === "suspended") where.status = "suspended";
  if (filter === "verification") {
    const pending = await ArtistProfile.find({ "verification.status": "pending" })
      .select("userId")
      .lean();
    where._id = { $in: pending.map((artist) => artist.userId).filter(Boolean) };
  }
  const [users, total] = await Promise.all([
    User.find(where)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(USER_FIELDS)
      .lean(),
    User.countDocuments(where),
  ]);
  const artists = await ArtistProfile.find({
    userId: { $in: users.map((user) => user._id) },
  }).lean();
  const artistByUser = new Map(artists.map((artist) => [String(artist.userId), artist]));
  return {
    items: users.map((user) => toAdminUser(user, artistByUser.get(String(user._id)))),
    meta: buildPageMeta(total, page, limit),
  };
}

/**
 * A listener / creator (not staff) or 404 / 403.
 * @param {string} userId
 * @returns {Promise<Object>} Mongoose document
 */
async function requireManagedUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found", { code: ERROR_CODES.NOT_FOUND });
  if (user.staffRole) {
    throw ApiError.forbidden("Staff accounts are managed in Team", {
      code: ERROR_CODES.OWNER_PROTECTED,
    });
  }
  return user;
}

/**
 * One user with their activity.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function getUserDetail(userId) {
  const user = await User.findById(userId).select(USER_FIELDS).lean();
  if (!user) throw ApiError.notFound("User not found", { code: ERROR_CODES.NOT_FOUND });
  const id = new mongoose.Types.ObjectId(String(userId));
  const artist = await ArtistProfile.findOne({ userId: id }).lean();
  const monthAgo = new Date(Date.now() - 30 * DAY_MS);
  const [
    playsTotal,
    plays30d,
    likes,
    playlists,
    comments,
    uploads,
    published,
    reportsAgainst,
    recent,
  ] = await Promise.all([
    ListenEvent.countDocuments({ userId: id, type: { $in: ["play", "repeat"] } }),
    ListenEvent.countDocuments({
      userId: id,
      type: { $in: ["play", "repeat"] },
      createdAt: { $gte: monthAgo },
    }),
    Like.countDocuments({ userId: id }),
    Playlist.countDocuments({ ownerId: id, type: "user" }),
    Comment.countDocuments({ userId: id }),
    Track.countDocuments({ uploadedBy: id }),
    Track.countDocuments({ uploadedBy: id, status: "published" }),
    artist
      ? Report.countDocuments({
          $or: [
            { targetType: "artist", targetId: artist._id },
            {
              targetType: "track",
              targetId: { $in: await Track.find({ artistId: artist._id }).distinct("_id") },
            },
          ],
        })
      : 0,
    ListenEvent.find({ userId: id, type: { $in: ["play", "repeat"] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: "trackId", select: "title" })
      .lean(),
  ]);
  return {
    user: toAdminUser(user, artist),
    warnings: (user.warnings ?? []).map((warning) => ({ reason: warning.reason, at: warning.at })),
    verification: artist?.verification ?? null,
    activity: {
      playsTotal,
      plays30d,
      likes,
      playlists,
      comments,
      uploads,
      published,
      reportsAgainst,
      recentPlays: recent
        .filter((event) => event.trackId)
        .map((event) => ({
          title: event.trackId.title,
          trackId: String(event.trackId._id),
          at: event.createdAt,
        })),
    },
  };
}

/**
 * Suspend or reactivate an account. Suspending signs the user out everywhere.
 * @param {string} userId
 * @param {"active"|"suspended"} status
 * @returns {Promise<{ before: Object, after: Object }>}
 */
export async function setUserStatus(userId, status) {
  const user = await requireManagedUser(userId);
  const before = { status: user.status };
  user.status = status;
  await user.save();
  if (status === "suspended") await revokeAllSessionsForUser(user._id, "suspended");
  logger.info(`[AdminUsers] userId=${userId} status ${before.status} → ${status}`);
  return { before, after: { status } };
}

/**
 * Give or remove the creator role (listener stays).
 * @param {string} userId
 * @param {boolean} isCreator
 * @returns {Promise<{ before: Object, after: Object }>}
 */
export async function setCreatorRole(userId, isCreator) {
  const user = await requireManagedUser(userId);
  const before = { roles: [...user.roles] };
  const roles = new Set(user.roles);
  roles.add("listener");
  if (isCreator) roles.add("creator");
  else roles.delete("creator");
  user.roles = [...roles];
  await user.save();
  return { before, after: { roles: user.roles } };
}

/**
 * Verify (or un-verify) a user's artist profile.
 * @param {string} userId
 * @param {boolean} verified
 * @param {string} staffId
 * @returns {Promise<{ before: Object, after: Object }>}
 */
export async function setArtistVerified(userId, verified, staffId) {
  await requireManagedUser(userId);
  const artist = await ArtistProfile.findOne({ userId });
  if (!artist) throw ApiError.badRequest("This user has no artist profile yet");
  const before = { verified: artist.verified, verification: artist.verification?.status ?? "none" };
  artist.verified = verified;
  if (artist.verification?.status === "pending" || verified) {
    artist.verification = {
      ...(artist.verification?.toObject?.() ?? artist.verification ?? {}),
      status: verified ? "approved" : "rejected",
      reviewedAt: new Date(),
      reviewedBy: staffId,
    };
  }
  await artist.save();
  return { before, after: { verified, verification: artist.verification.status } };
}

/**
 * Email the user a password reset link.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function sendPasswordReset(userId) {
  const user = await requireManagedUser(userId);
  await requestPasswordReset(user.email);
}

/**
 * Creators waiting for the verified badge, oldest first.
 * @returns {Promise<Object[]>}
 */
export async function listVerificationRequests() {
  const artists = await ArtistProfile.find({ "verification.status": "pending" })
    .sort({ "verification.requestedAt": 1 })
    .populate("userId", USER_FIELDS)
    .lean();
  const counts = await Track.aggregate([
    { $match: { artistId: { $in: artists.map((artist) => artist._id) }, status: "published" } },
    { $group: { _id: "$artistId", songs: { $sum: 1 }, plays: { $sum: "$playCount" } } },
  ]);
  const byArtist = new Map(counts.map((row) => [String(row._id), row]));
  return artists
    .filter((artist) => artist.userId)
    .map((artist) => ({
      ...toAdminUser(artist.userId, artist),
      note: artist.verification?.note ?? "",
      requestedAt: artist.verification?.requestedAt ?? null,
      followers: artist.followersCount ?? 0,
      songs: byArtist.get(String(artist._id))?.songs ?? 0,
      plays: byArtist.get(String(artist._id))?.plays ?? 0,
    }));
}
