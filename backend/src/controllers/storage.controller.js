/**
 * Storage endpoints: /api/storage/*
 * - Local driver (development): signed uploads and signed, range-enabled downloads.
 * - Both drivers: public covers at /api/storage/public/<key> (S3 redirects to a signed URL).
 */
import { storage } from "../services/storage/index.js";
import { isPublicKey } from "../services/storage/storageKeys.js";
import { resolveKeyPath, verifyToken, writeUploadBody } from "../services/storage/local.driver.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const COVER_CACHE_SECONDS = 365 * 24 * 60 * 60; // cover keys are versioned, so cache forever

/**
 * Verify a local-storage token or throw 403.
 * @param {string} token
 * @param {"put"|"get"} op
 */
function readToken(token, op) {
  if (env.storage.driver !== "local") throw ApiError.notFound("Not available");
  try {
    return verifyToken(token, op);
  } catch {
    throw ApiError.forbidden("This link has expired. Please try again.");
  }
}

/** PUT /api/storage/local/upload?token=… — the browser sends the file body */
export const localUpload = asyncHandler(async (req, res) => {
  const { key, contentType, maxBytes } = readToken(req.query.token, "put");
  if (req.headers["content-type"] !== contentType) {
    throw ApiError.badRequest("The file type doesn't match what was signed");
  }
  // Refuse a declared oversized body up front (a clean 413 instead of a dropped connection)
  if (Number(req.headers["content-length"]) > maxBytes) {
    res.set("Connection", "close"); // the unread body makes this connection unusable
    throw new ApiError(413, "The file is larger than allowed");
  }
  try {
    const bytes = await writeUploadBody(req, key, maxBytes);
    return sendSuccess(res, { message: "Uploaded", data: { key, sizeBytes: bytes } });
  } catch (error) {
    if (error.statusCode === 413) throw new ApiError(413, "The file is larger than allowed");
    throw error;
  }
});

/** GET /api/storage/local/file?token=… — signed playback with HTTP range (seeking) */
export const localFile = asyncHandler(async (req, res) => {
  const { key } = readToken(req.query.token, "get");
  res.setHeader("Cache-Control", "private, max-age=3600");
  // sendFile answers Range requests with 206 Partial Content
  res.sendFile(resolveKeyPath(key), { acceptRanges: true, dotfiles: "deny" }, (error) => {
    if (error && !res.headersSent)
      res.status(404).json({ success: false, message: "File not found", error: null });
  });
});

/** GET /api/storage/public/<key> — cover images */
export const publicFile = asyncHandler(async (req, res) => {
  const key = [].concat(req.params.key).join("/");
  if (!isPublicKey(key)) throw ApiError.notFound("File not found");

  if (env.storage.driver === "s3") {
    // No public CDN domain configured: send the browser to a short-lived signed URL
    const url = await storage.createDownloadUrl(key, { ttlSeconds: 24 * 60 * 60 });
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.redirect(302, url);
  }

  res.setHeader("Cache-Control", `public, max-age=${COVER_CACHE_SECONDS}, immutable`);
  return res.sendFile(resolveKeyPath(key), { dotfiles: "deny" }, (error) => {
    if (error && !res.headersSent)
      res.status(404).json({ success: false, message: "File not found", error: null });
  });
});
