/**
 * Wrap an async route handler so rejected promises reach the error middleware.
 * (Express 5 also forwards rejections, but wrapping keeps the intent explicit
 * and the handlers portable.)
 * @param {Function} handler - async (req, res, next) => {}
 * @returns {Function} Express middleware
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
