/**
 * Listener / creator route protection.
 * - requireAuth: needs a valid user access token (Authorization: Bearer …).
 *   Stateless (no DB lookup) so it stays fast on hot routes.
 * - requireRole: additionally needs one of the given public roles.
 * Staff routes use staff.middleware.js instead.
 */
import { ERROR_CODES } from "../config/constants.js";
import { verifyAccessToken } from "../services/token.service.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Read the bearer token from the Authorization header.
 * @param {import("express").Request} req
 * @returns {string|null}
 */
export function getBearerToken(req) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

/**
 * Require a signed-in listener / creator. Sets `req.auth = { userId, sessionId, roles }`.
 * @type {import("express").RequestHandler}
 */
export function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return next(
      ApiError.unauthorized("Please log in to continue", { code: ERROR_CODES.AUTH_REQUIRED })
    );
  }

  try {
    const claims = verifyAccessToken(token);
    req.auth = { userId: claims.sub, sessionId: claims.sid, roles: claims.roles ?? [] };
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Allow guests, but recognise a signed-in listener (e.g. public playlists and
 * comments: guests can read, owners see more). With no token `req.auth` stays
 * undefined; a token that is present but expired still gets 401, so the client
 * refreshes its session and retries.
 * @type {import("express").RequestHandler}
 */
export function optionalAuth(req, res, next) {
  return getBearerToken(req) ? requireAuth(req, res, next) : next();
}

/**
 * Require at least one of the given public roles (use after requireAuth).
 * @param {...("listener"|"creator")} allowedRoles
 * @returns {import("express").RequestHandler}
 * @example router.post("/tracks", requireAuth, requireRole("creator"), createTrack)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const roles = req.auth?.roles ?? [];
    if (!allowedRoles.some((role) => roles.includes(role))) {
      return next(
        ApiError.forbidden(`This action needs the ${allowedRoles.join(" or ")} role`, {
          code: ERROR_CODES.FORBIDDEN,
        })
      );
    }
    return next();
  };
}
