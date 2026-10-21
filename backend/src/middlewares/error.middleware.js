/**
 * Central error handling: a 404 handler for unknown routes and the single
 * error middleware that formats every error into the standard response.
 */
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { sendError } from "../utils/ApiResponse.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

/**
 * Catch-all for routes that do not exist.
 * @type {import("express").RequestHandler}
 */
export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Translate known library errors (Mongoose, body-parser) into ApiErrors.
 * @param {Error} error
 * @returns {ApiError|Error} An ApiError when the error is recognised, else the original
 */
function normaliseError(error) {
  if (error instanceof ApiError) return error;

  // Malformed JSON body or body over the size limit (from express.json)
  if (error.type === "entity.parse.failed") {
    return ApiError.badRequest("Request body is not valid JSON");
  }
  if (error.type === "entity.too.large") {
    return new ApiError(413, "Request body is too large");
  }

  // Mongoose: schema validation failed
  if (error instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(
      Object.entries(error.errors).map(([field, fieldError]) => [field, fieldError.message])
    );
    return ApiError.badRequest("Validation failed", { fields });
  }

  // Mongoose: invalid ObjectId or type in a query
  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${error.path}`);
  }

  // MongoDB: unique index violation
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue ?? {})[0] ?? "field";
    return new ApiError(409, `A record with this ${field} already exists`);
  }

  return error;
}

/**
 * Format any error as `{ success: false, message, error }`.
 * Unexpected errors are logged in full but return a generic message so
 * internals never leak to clients.
 * @type {import("express").ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars -- Express needs all 4 args to treat this as an error handler
export function errorHandler(error, req, res, next) {
  const normalised = normaliseError(error);
  const isOperational = normalised instanceof ApiError;
  const statusCode = isOperational ? normalised.statusCode : 500;

  if (statusCode >= 500) {
    logger.error(
      { err: error, reqId: req.id },
      `[ErrorHandler] ${req.method} ${req.originalUrl} failed`
    );
  } else {
    logger.debug(
      `[ErrorHandler] ${statusCode} ${req.method} ${req.originalUrl}: ${normalised.message}`
    );
  }

  return sendError(res, {
    statusCode,
    message: isOperational ? normalised.message : "Something went wrong on our side",
    error: isOperational
      ? normalised.details
      : env.isProduction
        ? null
        : { name: error.name, detail: error.message }, // extra detail only outside production
  });
}
