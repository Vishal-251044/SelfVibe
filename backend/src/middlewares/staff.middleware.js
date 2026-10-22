/**
 * Owner / Admin Console route protection (PRD §8.2, ADL-4).
 * - requireStaff(): valid staff token + live staff session (not revoked, not idle)
 *   + account still has a staff role. Optionally limited to specific roles.
 * - requirePermission(permission): requireStaff + permission from the matrix.
 * Listener tokens never pass: they use a different secret and audience.
 */
import { ERROR_CODES, STAFF_ROLES } from "../config/constants.js";
import { hasPermission } from "../config/permissions.js";
import { verifyStaffAccessToken } from "../services/token.service.js";
import { getActiveStaffSession } from "../services/session.service.js";
import { User } from "../models/user.model.js";
import { getBearerToken } from "./auth.middleware.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

/**
 * Throw unless a staff role is allowed (pure — unit tested).
 * @param {string|null} staffRole - The member's current role
 * @param {Object} rule
 * @param {string[]} [rule.roles] - Allowed roles (empty = any staff role)
 * @param {string} [rule.permission] - Required permission
 * @throws {ApiError} 403 when not allowed
 */
export function assertStaffAccess(staffRole, { roles = [], permission } = {}) {
  const isStaff = STAFF_ROLES.includes(staffRole);
  const roleAllowed = roles.length === 0 || roles.includes(staffRole);
  const permissionAllowed = !permission || hasPermission(staffRole, permission);

  if (!isStaff || !roleAllowed || !permissionAllowed) {
    throw ApiError.forbidden("Not allowed", { code: ERROR_CODES.FORBIDDEN });
  }
}

/**
 * Build the staff guard middleware.
 * @param {Object} rule - See assertStaffAccess
 * @returns {import("express").RequestHandler}
 */
function staffGuard(rule) {
  return async (req, res, next) => {
    try {
      const token = getBearerToken(req);
      if (!token) {
        throw ApiError.unauthorized("Console sign-in required", {
          code: ERROR_CODES.AUTH_REQUIRED,
        });
      }

      const claims = verifyStaffAccessToken(token);
      const session = await getActiveStaffSession(claims.sid);

      // Re-read the role so demotions and suspensions apply immediately
      const user = await User.findById(claims.sub).select("staffRole status");
      if (!user || String(session.userId) !== String(user._id) || user.status !== "active") {
        throw ApiError.unauthorized("Your console access has ended", {
          code: ERROR_CODES.REFRESH_INVALID,
        });
      }

      try {
        assertStaffAccess(user.staffRole, rule);
      } catch (error) {
        logger.warn(
          `[StaffGuard] denied userId=${user._id} role=${user.staffRole} ${req.method} ${req.originalUrl}`
        );
        throw error;
      }

      req.staff = { userId: String(user._id), staffRole: user.staffRole, sessionId: claims.sid };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Require a staff member, optionally with one of the given roles.
 * @param {...("owner"|"admin"|"contentManager"|"moderator")} roles
 * @returns {import("express").RequestHandler}
 * @example router.get("/team", requireStaff("owner"), listTeam)
 */
export function requireStaff(...roles) {
  return staffGuard({ roles });
}

/**
 * Require a staff member whose role has a permission (preferred over role names).
 * @param {string} permission - Key from config/permissions.js, e.g. "music.manage"
 * @returns {import("express").RequestHandler}
 * @example router.post("/tracks", requirePermission("music.manage"), createTrack)
 */
export function requirePermission(permission) {
  return staffGuard({ permission });
}
