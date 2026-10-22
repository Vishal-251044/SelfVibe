/**
 * User lookups and the public shapes of a user sent to clients.
 * Only these serializers decide which user fields leave the API.
 */
import { User } from "../models/user.model.js";
import { getPermissionsForRole } from "../config/permissions.js";
import { ERROR_CODES } from "../config/constants.js";
import { isOwnAvatarUrl } from "./upload.service.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

/**
 * Public profile of the signed-in listener / creator.
 * @param {Object} user - User document
 * @returns {Object}
 */
export function toPublicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? null,
    bio: user.bio ?? "",
    emailVerified: Boolean(user.emailVerified),
    roles: user.roles,
    plan: user.plan,
    onboardingDone: user.onboardingDone,
    createdAt: user.createdAt,
  };
}

/**
 * Staff member as seen by the admin console, including their permissions.
 * @param {Object} user - User document with a staffRole
 * @returns {Object}
 */
export function toStaffUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? null,
    staffRole: user.staffRole,
    twoFactorEnabled: user.twoFactorEnabled,
    permissions: getPermissionsForRole(user.staffRole),
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Fetch a user by id.
 * @param {string} userId
 * @returns {Promise<Object>} The user document
 * @throws {ApiError} 404 if the user does not exist
 */
export async function getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound(`User not found with id: ${userId}`);
  return user;
}

/**
 * Update the signed-in user's profile (PATCH /users/me).
 * @param {string} userId
 * @param {{ name?: string, bio?: string, avatar?: string|null }} changes - Validated input
 * @returns {Promise<Object>} The updated user document
 * @throws {ApiError} 400 INVALID_UPLOAD when the avatar URL is not this user's upload
 */
export async function updateProfile(userId, changes) {
  const user = await getUserById(userId);

  if (changes.name !== undefined) user.name = changes.name;
  if (changes.bio !== undefined) user.bio = changes.bio;

  if (changes.avatar !== undefined && changes.avatar !== user.avatar) {
    // Only null (remove) or this user's own Cloudinary upload are accepted
    if (changes.avatar !== null && !isOwnAvatarUrl(changes.avatar, userId)) {
      throw ApiError.badRequest("Upload the photo first, then save your profile.", {
        code: ERROR_CODES.INVALID_UPLOAD,
        fields: { avatar: "This photo was not uploaded to SelfVibe" },
      });
    }
    user.avatar = changes.avatar;
  }

  await user.save();
  logger.info(
    `[UserService] profile updated userId=${userId} fields=${Object.keys(changes).join(",")}`
  );
  return user;
}
