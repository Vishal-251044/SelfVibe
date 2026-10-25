/**
 * Platform switches from the Owner's Settings (roadmap Day 9):
 * - maintenanceGate: while maintenance mode is on, the listener app's API
 *   answers 503 MAINTENANCE (staff console, auth refresh, health and the
 *   public settings stay available so the app can show the message)
 * - requireFeature(name): a route only works while its feature flag is on
 * - adminIpAllowlist: the console API only answers listed IPs (PRD ADL-6)
 */
import { getSettings, isFeatureOn } from "../services/settings.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../config/constants.js";
import { logger } from "../utils/logger.js";

/** Paths (under /api) that keep working during maintenance. */
const MAINTENANCE_OPEN = [
  /^\/admin(\/|$)/,
  /^\/settings\/public$/,
  /^\/auth\/(refresh|logout|me)$/,
];

/** @type {import("express").RequestHandler} */
export async function maintenanceGate(req, res, next) {
  try {
    if (MAINTENANCE_OPEN.some((pattern) => pattern.test(req.path))) return next();
    const { maintenance } = await getSettings();
    if (!maintenance.enabled) return next();
    return next(new ApiError(503, maintenance.message, { code: ERROR_CODES.MAINTENANCE }));
  } catch (error) {
    // Settings unreadable → don't take the whole API down
    logger.warn(`[Platform] maintenance check failed: ${error.message}`);
    return next();
  }
}

/**
 * Only continue while a feature flag is on.
 * @param {"comments"|"uploads"|"voice"} feature
 * @returns {import("express").RequestHandler}
 */
export function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      if (await isFeatureOn(feature)) return next();
      return next(
        ApiError.forbidden("This feature is switched off right now", {
          code: ERROR_CODES.FEATURE_OFF,
          feature,
        })
      );
    } catch (error) {
      return next(error);
    }
  };
}

/** @type {import("express").RequestHandler} */
export async function adminIpAllowlist(req, res, next) {
  try {
    const { adminIpAllowlist: allowed } = await getSettings();
    if (!allowed?.length || allowed.includes(req.ip)) return next();
    logger.warn(
      `[Platform] console request from a non-allowed IP ip=${req.ip} ${req.method} ${req.originalUrl}`
    );
    return next(
      ApiError.forbidden("The console is not available from this network", {
        code: ERROR_CODES.IP_NOT_ALLOWED,
      })
    );
  } catch (error) {
    return next(error);
  }
}
