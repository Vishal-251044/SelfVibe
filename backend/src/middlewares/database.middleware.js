/**
 * Fail fast with a clear 503 when MongoDB is not connected, instead of letting
 * queries hang for the driver timeout and end in a generic 500.
 */
import { getDbStatus } from "../config/db.js";
import { ERROR_CODES } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * @type {import("express").RequestHandler}
 */
export function requireDatabase(req, res, next) {
  if (getDbStatus() === "connected") return next();
  return next(
    new ApiError(
      503,
      "SelfVibe can't reach its database right now. Please try again in a moment.",
      {
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
      }
    )
  );
}
