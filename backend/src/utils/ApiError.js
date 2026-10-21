/**
 * Operational error with an HTTP status. Throw this from services and
 * controllers; the error middleware turns it into the standard error response.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (4xx / 5xx)
   * @param {string} message - Safe, user-facing message
   * @param {Object|null} [details] - Extra info sent as `error` (e.g. field errors)
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // expected error, safe to show the message to clients
  }

  /** @param {string} [message] @param {Object} [details] */
  static badRequest(message = "Bad request", details) {
    return new ApiError(400, message, details);
  }

  /** @param {string} [message] */
  static unauthorized(message = "Authentication required") {
    return new ApiError(401, message);
  }

  /** @param {string} [message] */
  static forbidden(message = "Not allowed") {
    return new ApiError(403, message);
  }

  /** @param {string} [message] */
  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }
}
