/**
 * Local-disk storage driver — DEVELOPMENT ONLY (STORAGE_DRIVER=local).
 * Mirrors the S3/R2 driver so the whole upload → process → stream flow works
 * before a bucket exists:
 *   - uploads: the browser PUTs to /api/storage/local/upload?token=… (signed, size-limited)
 *   - private files: /api/storage/local/file?token=… (signed, expiring, HTTP range)
 *   - public covers: /api/storage/public/<key>
 */
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

const ROOT = path.resolve(env.storage.localDir);
const TOKEN_AUDIENCE = "selfvibe:local-storage";
const TOKEN_SECRET = `${env.auth.jwtSecret}:local-storage`;

/**
 * Turn a storage key into a path inside the storage folder (never outside it).
 * @param {string} key
 * @returns {string}
 * @throws {Error} When the key tries to escape the storage folder
 */
export function resolveKeyPath(key) {
  const filePath = path.resolve(ROOT, key);
  if (!filePath.startsWith(ROOT + path.sep)) throw new Error(`[LocalStorage] invalid key: ${key}`);
  return filePath;
}

/**
 * Sign a short-lived token for one key and one operation.
 * @param {Object} claims - { key, op: "put"|"get", contentType?, maxBytes? }
 * @param {number} ttlSeconds
 * @returns {string}
 */
function signToken(claims, ttlSeconds) {
  return jwt.sign(claims, TOKEN_SECRET, { audience: TOKEN_AUDIENCE, expiresIn: ttlSeconds });
}

/**
 * Verify a storage token.
 * @param {string} token
 * @param {"put"|"get"} op
 * @returns {{ key: string, contentType?: string, maxBytes?: number }}
 * @throws {Error} When invalid, expired or for another operation
 */
export function verifyToken(token, op) {
  const claims = jwt.verify(String(token), TOKEN_SECRET, { audience: TOKEN_AUDIENCE });
  if (claims.op !== op) throw new Error("wrong token operation");
  return claims;
}

/** @type {import("./index.js").StorageDriver} */
export const localDriver = {
  name: "local",

  async createUploadTarget({ key, contentType, sizeBytes }) {
    const ttl = env.storage.uploadUrlTtlSeconds;
    const token = signToken({ key, op: "put", contentType, maxBytes: sizeBytes }, ttl);
    return {
      method: "PUT",
      url: `/api/storage/local/upload?token=${encodeURIComponent(token)}`,
      headers: { "Content-Type": contentType },
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
  },

  async createDownloadUrl(key, { ttlSeconds }) {
    const token = signToken({ key, op: "get" }, ttlSeconds);
    return `/api/storage/local/file?token=${encodeURIComponent(token)}`;
  },

  publicUrl(key) {
    return `/api/storage/public/${key}`;
  },

  async head(key) {
    try {
      const info = await stat(resolveKeyPath(key));
      return info.isFile() ? { sizeBytes: info.size } : null;
    } catch {
      return null;
    }
  },

  async putFile(localPath, key) {
    const target = resolveKeyPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(localPath, target);
  },

  async getToFile(key, localPath) {
    await pipeline(createReadStream(resolveKeyPath(key)), createWriteStream(localPath));
  },

  async move(fromKey, toKey) {
    const target = resolveKeyPath(toKey);
    await mkdir(path.dirname(target), { recursive: true });
    await rename(resolveKeyPath(fromKey), target);
  },

  async remove(keys) {
    await Promise.all(keys.filter(Boolean).map((key) => rm(resolveKeyPath(key), { force: true })));
  },
};

/**
 * Write an uploaded request body to disk, enforcing the signed size limit.
 * Used by the local upload route only.
 * @param {import("express").Request} req
 * @param {string} key
 * @param {number} maxBytes
 * @returns {Promise<number>} Bytes written
 * @throws {Error} With `.statusCode = 413` when the body is larger than allowed
 */
export async function writeUploadBody(req, key, maxBytes) {
  const target = resolveKeyPath(key);
  await mkdir(path.dirname(target), { recursive: true });

  let received = 0;
  req.on("data", (chunk) => {
    received += chunk.length;
    if (received > maxBytes) {
      const error = new Error("Upload is larger than allowed");
      error.statusCode = 413;
      req.destroy(error);
    }
  });

  try {
    await pipeline(req, createWriteStream(target));
    return received;
  } catch (error) {
    await rm(target, { force: true });
    throw error;
  }
}
