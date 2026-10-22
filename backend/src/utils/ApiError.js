/**
 * Operational error with an HTTP status. Throw this from services and
 * controllers; the error middleware turns it into the standard error response.
 * Pass `{ code }` in details (see ERROR_CODES) so clients can react to it.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (4xx / 5xx)
   * @param {string} message - Safe, user-facing message
   * @param {Object|null} [details] - Extra info sent as `error`, e.g. { code, fields }
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // expected error, safe to show the message to clients
  }

  /** @param {string} [message] @param {Object} [details] */
  static badRequest(message = "Bad request", details = null) {
    return new ApiError(400, message, details);
  }

  /** @param {string} [message] @param {Object} [details] */
  static unauthorized(message = "Authentication required", details = null) {
    return new ApiError(401, message, details);
  }

  /** @param {string} [message] @param {Object} [details] */
  static forbidden(message = "Not allowed", details = null) {
    return new ApiError(403, message, details);
  }

  /** @param {string} [message] @param {Object} [details] */
  static notFound(message = "Resource not found", details = null) {
    return new ApiError(404, message, details);
  }

  /** @param {string} [message] @param {Object} [details] */
  static conflict(message = "Conflict", details = null) {
    return new ApiError(409, message, details);
  }
}
