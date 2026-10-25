/**
 * Share links (PRD F28 / §10.8, roadmap Day 10): record that a song, public
 * playlist or artist was shared, so the hourly stats job can count song shares
 * (PRD PRF-1). Only things a guest could open are counted.
 */
import mongoose from "mongoose";
import { ShareEvent } from "../models/shareEvent.model.js";
import { Track } from "../models/track.model.js";
import { Playlist } from "../models/playlist.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../config/constants.js";

// What makes each kind of target publicly shareable
const SHAREABLE = {
  track: (id) => Track.exists({ _id: id, status: "published" }),
  playlist: (id) => Playlist.exists({ _id: id, isPublic: true }),
  artist: (id) => ArtistProfile.exists({ _id: id }),
};

/**
 * Record one share.
 * @param {{ targetType: "track"|"playlist"|"artist", targetId: string, channel?: "native"|"copy" }} input
 * @param {string|null} userId - The signed-in sharer, if any
 * @returns {Promise<void>}
 * @throws {ApiError} 404 when the target doesn't exist or isn't public
 */
export async function recordShare({ targetType, targetId, channel = "native" }, userId) {
  if (!mongoose.isValidObjectId(targetId) || !(await SHAREABLE[targetType](targetId))) {
    throw ApiError.notFound("This can't be shared", { code: ERROR_CODES.NOT_FOUND });
  }
  await ShareEvent.create({ targetType, targetId, channel, userId: userId ?? null });
}
