/**
 * Cloudinary storage driver for the storage pool (PRD 10.13, STO-1).
 * Keys look like "<accountKey>/<path>" (see storageKeys.js); the account part
 * chooses which Cloudinary account (from CLOUDINARY_ACCOUNTS) holds the file.
 *
 * - Audio is stored as resource type "video" with delivery type
 *   "authenticated": it can only be played through signed URLs from our API.
 * - Images are stored as resource type "image", type "upload" (public CDN).
 * - Browser uploads are signed POSTs straight to Cloudinary (PRD CRT-3);
 *   the API never holds the file.
 * Uses Cloudinary's REST API directly (no SDK): uploads and deletes are signed
 * with the account's API secret, Admin API calls use basic auth.
 */
import { createHash } from "node:crypto";
import { createWriteStream, openAsBlob } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { env } from "../../config/env.js";
import { splitAccountKey } from "./storageKeys.js";

const API_BASE = "https://api.cloudinary.com/v1_1";
const CDN_BASE = "https://res.cloudinary.com";
const ROOT_FOLDER = "selfvibe"; // keeps SelfVibe files together in each account
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const REQUEST_TIMEOUT_MS = 60_000;
const UPLOAD_SIGNATURE_TTL_SECONDS = 60 * 60; // Cloudinary accepts a signature for 1 hour
const DEFAULT_DOWNLOAD_TTL_SECONDS = 60 * 60; // server-side downloads (processing)

/**
 * The configured account for a key (or by key name).
 * @param {string} accountKey
 * @returns {{ key: string, cloudName: string, apiKey: string, apiSecret: string }}
 * @throws {Error} When the account is not in CLOUDINARY_ACCOUNTS
 */
export function getCloudinaryAccount(accountKey) {
  const account = env.storage.cloudinaryAccounts.find((entry) => entry.key === accountKey);
  if (!account) {
    throw new Error(`[Cloudinary] storage account "${accountKey}" is not in CLOUDINARY_ACCOUNTS`);
  }
  return account;
}

/**
 * Where a storage key lives in Cloudinary.
 * @param {string} key - "<accountKey>/<path>.<ext>"
 * @returns {{ account: Object, publicId: string, format: string, resourceType: "image"|"video", type: "upload"|"authenticated" }}
 */
export function locate(key) {
  const { accountKey, path: keyPath } = splitAccountKey(key);
  if (!accountKey) throw new Error(`[Cloudinary] key "${key}" has no storage account`);
  const extension = path.extname(keyPath).slice(1).toLowerCase();
  const resourceType = IMAGE_EXTENSIONS.has(extension) ? "image" : "video";
  return {
    account: getCloudinaryAccount(accountKey),
    publicId: `${ROOT_FOLDER}/${keyPath.slice(0, keyPath.length - extension.length - 1)}`,
    format: extension,
    resourceType,
    type: resourceType === "image" ? "upload" : "authenticated",
  };
}

/**
 * Cloudinary API signature: SHA-1 of the sorted "key=value" pairs + API secret.
 * @param {Object<string, string|number|boolean>} params - Signed parameters only
 * @param {string} apiSecret
 * @returns {string}
 */
export function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter((name) => params[name] !== undefined && params[name] !== null && params[name] !== "")
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join("&");
  return createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
}

/**
 * Signed delivery URL for an authenticated file (only our API can produce it).
 * @param {{ account: Object, publicId: string, format: string, resourceType: string }} location
 * @returns {string}
 */
export function signedDeliveryUrl({ account, publicId, format, resourceType }) {
  const toSign = `${publicId}.${format}`;
  const signature = createHash("sha1")
    .update(toSign + account.apiSecret)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .slice(0, 8);
  return `${CDN_BASE}/${account.cloudName}/${resourceType}/authenticated/s--${signature}--/${toSign}`;
}

/**
 * Expiring private download URL for an authenticated file (Upload API "download").
 * @param {ReturnType<typeof locate>} location
 * @param {number} ttlSeconds
 * @returns {string}
 */
export function privateDownloadUrl({ account, publicId, format, resourceType, type }, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const params = {
    public_id: publicId,
    format,
    type,
    expires_at: now + ttlSeconds,
    timestamp: now,
  };
  const query = new URLSearchParams({
    ...params,
    api_key: account.apiKey,
    signature: signParams(params, account.apiSecret),
  });
  return `${API_BASE}/${account.cloudName}/${resourceType}/download?${query}`;
}

/**
 * Encode a public id for a URL path (keep the folder slashes).
 * @param {string} publicId
 * @returns {string}
 */
const encodePublicId = (publicId) => publicId.split("/").map(encodeURIComponent).join("/");

/**
 * Call the Cloudinary API and return the JSON body.
 * @param {Object} account
 * @param {string} method
 * @param {string} apiPath - e.g. "video/upload"
 * @param {Object} [options]
 * @param {FormData|URLSearchParams} [options.body]
 * @param {boolean} [options.admin=false] - Use basic auth (Admin API)
 * @param {boolean} [options.allowNotFound=false] - Return null on 404
 * @returns {Promise<Object|null>}
 * @throws {Error} With the account, endpoint and Cloudinary's message
 */
async function callApi(
  account,
  method,
  apiPath,
  { body, admin = false, allowNotFound = false } = {}
) {
  const headers = admin
    ? {
        Authorization: `Basic ${Buffer.from(`${account.apiKey}:${account.apiSecret}`).toString("base64")}`,
      }
    : {};
  let response;
  try {
    response = await fetch(`${API_BASE}/${account.cloudName}/${apiPath}`, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(`[Cloudinary] ${account.key} ${apiPath}: ${error.message}`);
  }
  if (allowNotFound && response.status === 404) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `[Cloudinary] ${account.key} ${apiPath} failed (HTTP ${response.status}): ${payload?.error?.message ?? "no details"}`
    );
  }
  return payload;
}

/**
 * Signed upload parameters for one file (used by the browser and the server).
 * @param {ReturnType<typeof locate>} location
 * @returns {Object} Form fields including api_key and signature
 */
function uploadFields({ account, publicId, type }) {
  const params = {
    public_id: publicId,
    timestamp: Math.floor(Date.now() / 1000),
    type,
    overwrite: true,
  };
  return { ...params, api_key: account.apiKey, signature: signParams(params, account.apiSecret) };
}

/**
 * Real usage of one account from the Admin API (PRD 10.13 step 6).
 * @param {string} accountKey
 * @returns {Promise<{ bytesUsed: number, bandwidthBytes: number, creditsUsedPercent: number|null }>}
 */
export async function fetchCloudinaryUsage(accountKey) {
  const usage = await callApi(getCloudinaryAccount(accountKey), "GET", "usage", { admin: true });
  return {
    bytesUsed: usage?.storage?.usage ?? 0,
    bandwidthBytes: usage?.bandwidth?.usage ?? 0,
    creditsUsedPercent: usage?.credits?.used_percent ?? null,
  };
}

/** @type {import("./index.js").StorageDriver} */
export const cloudinaryDriver = {
  name: "cloudinary",

  async createUploadTarget({ key }) {
    const location = locate(key);
    return {
      method: "POST",
      url: `${API_BASE}/${location.account.cloudName}/${location.resourceType}/upload`,
      headers: {},
      fields: uploadFields(location), // sent as multipart form fields, with the file as "file"
      expiresAt: new Date(Date.now() + UPLOAD_SIGNATURE_TTL_SECONDS * 1000),
    };
  },

  // Audio: a signed, EXPIRING private download link (PRD 10.13 step 5). Verified against
  // Cloudinary: it supports range requests (seeking), allows browser playback (CORS) and
  // answers 401 once expired. Images are public CDN URLs.
  async createDownloadUrl(key, { ttlSeconds = DEFAULT_DOWNLOAD_TTL_SECONDS } = {}) {
    const location = locate(key);
    return location.type === "authenticated"
      ? privateDownloadUrl(location, ttlSeconds)
      : cloudinaryDriver.publicUrl(key);
  },

  publicUrl(key) {
    const { account, publicId, format, resourceType } = locate(key);
    return `${CDN_BASE}/${account.cloudName}/${resourceType}/upload/${publicId}.${format}`;
  },

  // Checked through the CDN (a HEAD request) so it does not use the Admin API's hourly
  // rate limit — bulk uploads check up to 50 files at once. Falls back to the Admin API
  // when the CDN does not report a size.
  async head(key) {
    const location = locate(key);
    const url =
      location.type === "authenticated"
        ? signedDeliveryUrl(location)
        : cloudinaryDriver.publicUrl(key);
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch(() => null);
    if (response?.status === 404) return null;
    const contentLength = Number(response?.headers.get("content-length"));
    if (response?.ok && contentLength > 0) return { sizeBytes: contentLength };

    const resource = await callApi(
      location.account,
      "GET",
      `resources/${location.resourceType}/${location.type}/${encodePublicId(location.publicId)}`,
      { admin: true, allowNotFound: true }
    );
    return resource ? { sizeBytes: resource.bytes ?? 0 } : null;
  },

  async putFile(localPath, key, contentType) {
    const location = locate(key);
    const form = new FormData();
    Object.entries(uploadFields(location)).forEach(([name, value]) =>
      form.append(name, String(value))
    );
    form.append(
      "file",
      // Streamed from disk, never loaded into memory (originals can be 50 MB)
      await openAsBlob(localPath, { type: contentType }),
      path.basename(localPath)
    );
    await callApi(location.account, "POST", `${location.resourceType}/upload`, { body: form });
  },

  async getToFile(key, localPath) {
    const url = await cloudinaryDriver.createDownloadUrl(key);
    const response = await fetch(url, { signal: AbortSignal.timeout(5 * 60_000) });
    if (!response.ok || !response.body) {
      throw new Error(`[Cloudinary] download of ${key} failed (HTTP ${response.status})`);
    }
    await pipeline(Readable.fromWeb(response.body), createWriteStream(localPath));
  },

  async move(fromKey, toKey) {
    const from = locate(fromKey);
    const to = locate(toKey);
    if (from.account.key !== to.account.key || from.resourceType !== to.resourceType) {
      throw new Error("[Cloudinary] files can only be moved within one account and type");
    }
    const params = {
      from_public_id: from.publicId,
      to_public_id: to.publicId,
      type: from.type,
      overwrite: true,
      timestamp: Math.floor(Date.now() / 1000),
    };
    await callApi(from.account, "POST", `${from.resourceType}/rename`, {
      body: new URLSearchParams({
        ...params,
        api_key: from.account.apiKey,
        signature: signParams(params, from.account.apiSecret),
      }),
    });
  },

  async remove(keys) {
    await Promise.all(
      keys.filter(Boolean).map(async (key) => {
        const location = locate(key);
        const params = {
          public_id: location.publicId,
          type: location.type,
          invalidate: true,
          timestamp: Math.floor(Date.now() / 1000),
        };
        await callApi(location.account, "POST", `${location.resourceType}/destroy`, {
          body: new URLSearchParams({
            ...params,
            api_key: location.account.apiKey,
            signature: signParams(params, location.account.apiSecret),
          }),
        });
      })
    );
  },
};
