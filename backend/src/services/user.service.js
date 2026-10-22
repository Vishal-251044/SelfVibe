/**
 * User lookups and the public shapes of a user sent to clients.
 * Only these serializers decide which user fields leave the API.
 */
import { User } from "../models/user.model.js";
import { getPermissionsForRole } from "../config/permissions.js";
import { ApiError } from "../utils/ApiError.js";

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
