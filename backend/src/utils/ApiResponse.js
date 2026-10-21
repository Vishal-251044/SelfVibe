/**
 * Builders for the standard API response envelope:
 *   { "success": true,  "message": "...", "data": { } }
 *   { "success": false, "message": "...", "error": { } }
 */

/**
 * Send a success response.
 * @param {import("express").Response} res
 * @param {Object} options
 * @param {number} [options.statusCode=200]
 * @param {string} [options.message="OK"]
 * @param {any} [options.data=null]
 * @returns {import("express").Response}
 */
export function sendSuccess(res, { statusCode = 200, message = "OK", data = null } = {}) {
  return res.status(statusCode).json({ success: true, message, data });
}

/**
 * Send an error response.
 * @param {import("express").Response} res
 * @param {Object} options
 * @param {number} [options.statusCode=500]
 * @param {string} [options.message="Something went wrong"]
 * @param {any} [options.error=null] - Extra error details
 * @returns {import("express").Response}
 */
export function sendError(
  res,
  { statusCode = 500, message = "Something went wrong", error = null } = {}
) {
  return res.status(statusCode).json({ success: false, message, error });
}
