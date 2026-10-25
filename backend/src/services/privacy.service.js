/**
 * Privacy (PRD §14 "Users can download / delete their data", roadmap Day 10
 * launch hardening):
 * - exportMyData(): everything SelfVibe keeps about a listener, as one JSON file
 * - deleteMyAccount(): removes the account and personal data for good. The
 *   person confirms with their password (or by typing DELETE for Google-only
 *   accounts). Staff must leave the team first; the Owner never can.
 */
import { User } from "../models/user.model.js";
import { TasteProfile } from "../models/tasteProfile.model.js";
import { Like } from "../models/like.model.js";
import { Follow } from "../models/follow.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Comment } from "../models/comment.model.js";
import { CommentLike } from "../models/commentLike.model.js";
import { ListenEvent } from "../models/listenEvent.model.js";
import { VoiceLog } from "../models/voiceLog.model.js";
import { FeedCache } from "../models/feedCache.model.js";
import { Report } from "../models/report.model.js";
import { ShareEvent } from "../models/shareEvent.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { Track } from "../models/track.model.js";
import { deleteTrack } from "./track.service.js";
import { revokeAllSessionsForUser } from "./session.service.js";
import { verifyPassword } from "../utils/password.js";
import { ApiError } from "../utils/ApiError.js";
import { APP_VERSION, ERROR_CODES } from "../config/constants.js";
import { logger } from "../utils/logger.js";

// Listening history can be long; the export keeps the most recent entries
const EXPORT_HISTORY_LIMIT = 10_000;
export const DELETE_CONFIRM_WORD = "DELETE";

/**
 * Everything stored about one user, readable by a person.
 * @param {string} userId
 * @returns {Promise<Object>} JSON-ready export
 */
export async function exportMyData(userId) {
  const user = await User.findById(userId).select("+passwordHash +googleId").lean();
  if (!user) throw ApiError.notFound("Account not found", { code: ERROR_CODES.NOT_FOUND });

  const [taste, likes, follows, playlists, comments, history, voice, artist, reports] =
    await Promise.all([
      TasteProfile.findOne({ userId }).lean(),
      Like.find({ userId }).populate("trackId", "title").sort({ createdAt: -1 }).lean(),
      Follow.find({ userId }).populate("artistId", "stageName").lean(),
      Playlist.find({ ownerId: userId, type: "user" }).populate("tracks.trackId", "title").lean(),
      Comment.find({ userId, status: { $ne: "removed" } })
        .populate("trackId", "title")
        .sort({ createdAt: -1 })
        .lean(),
      ListenEvent.find({ userId })
        .populate("trackId", "title")
        .sort({ createdAt: -1 })
        .limit(EXPORT_HISTORY_LIMIT)
        .lean(),
      VoiceLog.find({ userId }).sort({ createdAt: -1 }).lean(),
      ArtistProfile.findOne({ userId }).lean(),
      Report.find({ reporterId: userId }).lean(),
    ]);
  const uploads = artist
    ? await Track.find({ uploadedBy: userId }).select("title status createdAt publishedAt").lean()
    : [];

  const title = (ref) => ref?.title ?? "(removed song)";
  return {
    exportedAt: new Date().toISOString(),
    app: `SelfVibe ${APP_VERSION}`,
    account: {
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar,
      plan: user.plan,
      roles: user.roles,
      catalogFilter: user.catalogFilter,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      signInMethods: [user.passwordHash && "password", user.googleId && "google"].filter(Boolean),
      recentSearches: user.recentSearches,
    },
    tasteProfile: taste
      ? {
          // Learned weights (higher = more of it in your feed)
          genres: taste.genreWeights,
          vibes: taste.vibeWeights,
          moods: taste.moodWeights,
          artists: taste.artistWeights,
          energyPreference: taste.energyPref,
          hiddenSongs: taste.hiddenTrackIds?.length ?? 0,
          updatedAt: taste.updatedAt,
        }
      : null,
    likedSongs: likes.map((like) => ({ song: title(like.trackId), likedAt: like.createdAt })),
    followedArtists: follows.map((follow) => ({
      artist: follow.artistId?.stageName ?? "(removed artist)",
      followedAt: follow.createdAt,
    })),
    playlists: playlists.map((playlist) => ({
      name: playlist.name,
      description: playlist.description,
      isPublic: playlist.isPublic,
      songs: playlist.tracks.map((entry) => title(entry.trackId)),
      createdAt: playlist.createdAt,
    })),
    comments: comments.map((comment) => ({
      song: title(comment.trackId),
      text: comment.body,
      at: comment.createdAt,
    })),
    listeningHistory: history.map((event) => ({
      song: title(event.trackId),
      type: event.type,
      percent: event.percent,
      at: event.createdAt,
    })),
    voiceCommands: voice.map((entry) => ({
      text: entry.transcript,
      language: entry.language,
      at: entry.createdAt,
    })),
    reportsFiled: reports.map((report) => ({
      targetType: report.targetType,
      reason: report.reason,
      status: report.status,
      at: report.createdAt,
    })),
    creator: artist
      ? {
          stageName: artist.stageName,
          bio: artist.bio,
          uploads: uploads.map((track) => ({
            title: track.title,
            status: track.status,
            uploadedAt: track.createdAt,
          })),
        }
      : null,
  };
}

/**
 * Check the person really wants to delete the account.
 * @param {Object} user - With passwordHash selected
 * @param {{ password?: string, confirm?: string }} input
 * @throws {ApiError} 400 / 401 with a field message
 */
async function assertDeleteConfirmed(user, { password, confirm }) {
  if (user.passwordHash) {
    if (!password || !(await verifyPassword(password, user.passwordHash))) {
      throw ApiError.unauthorized("That password is not correct", {
        code: ERROR_CODES.INVALID_CREDENTIALS,
        fields: { password: "Wrong password" },
      });
    }
    return;
  }
  if (confirm !== DELETE_CONFIRM_WORD) {
    throw ApiError.badRequest(`Type ${DELETE_CONFIRM_WORD} to confirm`, {
      code: ERROR_CODES.VALIDATION_FAILED,
      fields: { confirm: `Type ${DELETE_CONFIRM_WORD} to confirm` },
    });
  }
}

/**
 * Delete an account and the personal data linked to it.
 * - removed: likes, follows, own playlists, taste profile, history, voice logs,
 *   feed cache, sessions, comment likes, the creator profile and its uploads
 * - comments are blanked and hidden (replies by others keep their thread)
 * - shares and filed reports stay for statistics, without the person's id
 * @param {string} userId
 * @param {{ password?: string, confirm?: string }} input
 * @returns {Promise<void>}
 * @throws {ApiError} 403 for staff accounts
 */
export async function deleteMyAccount(userId, input) {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw ApiError.notFound("Account not found", { code: ERROR_CODES.NOT_FOUND });
  if (user.staffRole) {
    throw ApiError.forbidden(
      user.staffRole === "owner"
        ? "The Owner account can't be deleted"
        : "Ask the Owner to remove you from the console team first",
      { code: user.staffRole === "owner" ? ERROR_CODES.OWNER_PROTECTED : ERROR_CODES.FORBIDDEN }
    );
  }
  await assertDeleteConfirmed(user, input);

  // Sign out everywhere first, so nothing new is written while we clean up
  await revokeAllSessionsForUser(userId, "account_deleted");

  const artist = await ArtistProfile.findOne({ userId }).select("_id").lean();
  if (artist) {
    const uploads = await Track.find({ uploadedBy: userId }).select("_id").lean();
    for (const track of uploads) await deleteTrack(String(track._id));
    await Follow.deleteMany({ artistId: artist._id });
    await ArtistProfile.deleteOne({ _id: artist._id });
  }

  const likedComments = await CommentLike.find({ userId }).select("commentId").lean();
  await Promise.all([
    Like.deleteMany({ userId }),
    Follow.deleteMany({ userId }),
    Playlist.deleteMany({ ownerId: userId, type: "user" }),
    TasteProfile.deleteOne({ userId }),
    ListenEvent.deleteMany({ userId }),
    VoiceLog.deleteMany({ userId }),
    FeedCache.deleteMany({ userId }),
    CommentLike.deleteMany({ userId }),
    Comment.updateMany({ userId }, { $set: { status: "removed", body: "(deleted)" } }),
    ShareEvent.updateMany({ userId }, { $set: { userId: null } }),
  ]);
  // Keep the like counts on other people's comments honest
  if (likedComments.length > 0) {
    await Comment.updateMany(
      { _id: { $in: likedComments.map((entry) => entry.commentId) }, likeCount: { $gt: 0 } },
      { $inc: { likeCount: -1 } }
    );
  }
  await User.deleteOne({ _id: userId });
  logger.info(`[Privacy] account deleted userId=${userId}`);
}
