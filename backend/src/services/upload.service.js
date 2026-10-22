/**
 * Cloudinary uploads for avatars (and cover images later): the browser uploads
 * directly to Cloudinary with a short-lived signature from us, so the API never
 * handles image bytes (same pattern as PRD CRT-3). Implemented with Cloudinary's
 * documented signing scheme — no SDK needed.
 */
import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { AVATAR_UPLOAD, ERROR_CODES } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";

// Normalise every avatar on upload: 512×512, cropped around the face
const AVATAR_TRANSFORMATION = "c_fill,g_face,h_512,w_512";

/**
 * Sign upload parameters the way Cloudinary expects: sort keys, join as
 * key=value with "&", append the API secret, SHA-1 hex.
 * @param {Object<string, string|number|boolean>} params - Parameters to sign
 * @param {string} apiSecret
 * @returns {string} Signature
 */
export function signCloudinaryParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
}

/**
 * Throw 503 when Cloudinary is not configured.
 * @throws {ApiError}
 */
function assertCloudinaryConfigured() {
  if (!env.cloudinary.isConfigured) {
    throw new ApiError(503, "Photo uploads are not available yet.", {
      code: ERROR_CODES.NOT_CONFIGURED,
    });
  }
}

/**
 * Create a one-off signature for uploading the user's avatar.
 * Each user has exactly one avatar file (public id user_<id>), overwritten on change.
 * @param {string} userId
 * @returns {{ uploadUrl: string, fields: Object<string, string|number>, maxBytes: number }}
 *   POST the file to uploadUrl as multipart form data with `file` + every field
 */
export function createAvatarUploadSignature(userId) {
  assertCloudinaryConfigured();
  const { cloudName, apiKey, apiSecret } = env.cloudinary;

  const params = {
    allowed_formats: AVATAR_UPLOAD.allowedFormats.join(","),
    folder: AVATAR_UPLOAD.folder,
    invalidate: "true",
    overwrite: "true",
    public_id: `user_${userId}`,
    timestamp: Math.floor(Date.now() / 1000), // Cloudinary rejects signatures older than 1 hour
    transformation: AVATAR_TRANSFORMATION,
  };

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    fields: { ...params, api_key: apiKey, signature: signCloudinaryParams(params, apiSecret) },
    maxBytes: AVATAR_UPLOAD.maxBytes,
  };
}

/**
 * Whether a URL is this user's avatar in our Cloudinary account (so clients
 * cannot set an avatar pointing anywhere else).
 * @param {string} url
 * @param {string} userId
 * @returns {boolean}
 */
export function isOwnAvatarUrl(url, userId) {
  if (!env.cloudinary.isConfigured || typeof url !== "string") return false;
  const prefix = `https://res.cloudinary.com/${env.cloudinary.cloudName}/image/upload/`;
  return url.startsWith(prefix) && url.includes(`/${AVATAR_UPLOAD.folder}/user_${userId}.`);
}
