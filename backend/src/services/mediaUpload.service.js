/**
 * Direct-to-storage uploads (PRD CRT-3): sign an upload for the browser, then
 * check the uploaded object before anything uses it. Also turns an uploaded
 * image into a square WebP cover (artists, albums).
 */
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Track } from "../models/track.model.js";
import { storage } from "./storage/index.js";
import { coverKey, incomingKey, isIncomingKeyOwnedBy } from "./storage/storageKeys.js";
import { makeSquareCover } from "./media/ffmpeg.js";
import { AUDIO_UPLOAD, ERROR_CODES, IMAGE_UPLOAD } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";

const KIND_RULES = { audio: AUDIO_UPLOAD, image: IMAGE_UPLOAD };

/**
 * Create a signed upload URL for one file.
 * @param {{ userId?: string, staffId?: string }} owner - Who is uploading
 * @param {{ kind: "audio"|"image", contentType: string, sizeBytes: number }} file
 * @returns {Promise<{ key: string, upload: { method: string, url: string, headers: Object }, expiresAt: Date }>}
 * @throws {ApiError} 400 for unsupported types or files that are too large
 */
export async function signUpload(owner, { kind, contentType, sizeBytes }) {
  const rules = KIND_RULES[kind];
  const extension = rules?.mimeTypes[contentType];
  if (!extension) {
    const allowed = [...new Set(Object.values(rules?.mimeTypes ?? {}))].join(", ").toUpperCase();
    throw ApiError.badRequest(`Unsupported file type. Use ${allowed}.`, {
      code: ERROR_CODES.INVALID_UPLOAD,
      fields: { contentType: "Unsupported file type" },
    });
  }
  if (sizeBytes > rules.maxBytes) {
    throw ApiError.badRequest(
      `File is too large (max ${Math.round(rules.maxBytes / 1024 / 1024)} MB).`,
      {
        code: ERROR_CODES.INVALID_UPLOAD,
        fields: { sizeBytes: "File is too large" },
      }
    );
  }

  const key = incomingKey(owner, extension);
  const target = await storage.createUploadTarget({ key, contentType, sizeBytes });
  return {
    key,
    upload: { method: target.method, url: target.url, headers: target.headers },
    expiresAt: target.expiresAt,
  };
}

/**
 * Make sure an uploaded key belongs to this owner and the file really arrived.
 * @param {string} key
 * @param {{ userId?: string, staffId?: string }} owner
 * @param {"audio"|"image"} kind
 * @param {string} field - Form field name for the error message
 * @returns {Promise<void>}
 * @throws {ApiError} 400 INVALID_UPLOAD
 */
export async function assertUploaded(key, owner, kind, field) {
  const fail = (message) =>
    ApiError.badRequest(message, {
      code: ERROR_CODES.INVALID_UPLOAD,
      fields: { [field]: message },
    });

  if (!isIncomingKeyOwnedBy(key, owner)) throw fail("This file was not uploaded by you");
  const object = await storage.head(key);
  if (!object) throw fail("The upload did not finish. Please upload the file again.");
  if (object.sizeBytes > KIND_RULES[kind].maxBytes) throw fail("File is too large");
  if (object.sizeBytes === 0) throw fail("The uploaded file is empty");

  // Processing moves the file away later, so a second track could grab it in the meantime
  const usedBy = await Track.exists(
    kind === "audio" ? { "audio.sourceKey": key } : { coverSourceKey: key }
  );
  if (usedBy) throw fail("This upload was already used. Please upload the file again.");
}

/**
 * Turn an uploaded image into a public square WebP cover (sync — images are small).
 * @param {string} sourceKey - Incoming image key (already checked with assertUploaded)
 * @param {"artists"|"albums"|"tracks"} kind
 * @param {string} id - Owning document id
 * @returns {Promise<{ key: string, url: string }>}
 * @throws {ApiError} 400 when the file is not a readable image
 */
export async function processCoverUpload(sourceKey, kind, id) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "selfvibe-cover-"));
  try {
    const input = path.join(dir, `source${path.extname(sourceKey)}`);
    const output = path.join(dir, "cover.webp");
    await storage.getToFile(sourceKey, input);
    try {
      await makeSquareCover(input, output);
    } catch {
      throw ApiError.badRequest("That image could not be read. Try a JPG, PNG or WebP.", {
        code: ERROR_CODES.INVALID_UPLOAD,
      });
    }
    const key = coverKey(kind, id, Date.now().toString(36));
    await storage.putFile(output, key, "image/webp");
    await storage.remove([sourceKey]);
    return { key, url: storage.publicUrl(key) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
