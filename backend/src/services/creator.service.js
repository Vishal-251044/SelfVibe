/**
 * "Become a Creator" (PRD CRT-1): adds the creator role to the same account
 * and creates a public artist profile (stage name, bio, socials).
 */
import { User } from "../models/user.model.js";
import { ArtistProfile } from "../models/artistProfile.model.js";
import { generateUniqueArtistSlug } from "./artist.service.js";
import { ERROR_CODES } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

/**
 * The signed-in user's artist profile, or null if they are not a creator yet.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function getMyArtistProfile(userId) {
  return ArtistProfile.findOne({ userId });
}

/**
 * Require the user's artist profile (for creator-only actions).
 * @param {string} userId
 * @returns {Promise<Object>}
 * @throws {ApiError} 403 when the user has not become a creator
 */
export async function requireMyArtistProfile(userId) {
  const artist = await getMyArtistProfile(userId);
  if (!artist) {
    throw ApiError.forbidden("Become a creator first to upload music", {
      code: ERROR_CODES.FORBIDDEN,
    });
  }
  return artist;
}

/**
 * Turn a listener into a creator. Safe to call twice (returns the existing profile).
 * @param {string} userId
 * @param {{ stageName: string, bio?: string, genres?: string[], socials?: Object }} input
 * @returns {Promise<{ user: Object, artist: Object }>}
 */
export async function becomeCreator(userId, input) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound(`User not found with id: ${userId}`);

  let artist = await getMyArtistProfile(userId);
  if (!artist) {
    artist = await ArtistProfile.create({
      userId,
      stageName: input.stageName,
      slug: await generateUniqueArtistSlug(input.stageName),
      bio: input.bio ?? "",
      genres: input.genres ?? [],
      socials: input.socials ?? {},
      avatar: user.avatar ?? null,
      country: "IN",
    });
    logger.debug(`[CreatorService] userId=${userId} became a creator artistId=${artist._id}`);
  }

  if (!user.roles.includes("creator")) {
    user.roles = [...user.roles, "creator"];
    await user.save();
  }
  return { user, artist };
}

/**
 * Edit the creator's own artist profile.
 * @param {string} userId
 * @param {Object} changes - stageName, bio, genres, socials, avatar
 * @returns {Promise<Object>} The artist
 */
export async function updateMyArtistProfile(userId, changes) {
  const artist = await requireMyArtistProfile(userId);
  Object.assign(artist, changes);
  await artist.save();
  return artist;
}
