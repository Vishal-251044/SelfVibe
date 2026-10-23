/**
 * S3-compatible storage driver: Cloudflare R2 (recommended) or AWS S3.
 * - Uploads: presigned PUT URLs; the browser sends the file straight to the
 *   bucket (PRD CRT-3), with the exact size signed in.
 * - Audio: private; listeners get presigned GET URLs that expire. Range
 *   requests (seeking) are handled by the bucket itself.
 * - Covers: public via S3_PUBLIC_BASE_URL (CDN / R2 public domain), else via
 *   the API's /api/storage/public redirect.
 */
import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env.js";

const config = env.storage.s3;
let client = null;

/** Lazily create the S3 client (so the local driver never needs AWS config). */
function getClient() {
  client ??= new S3Client({
    region: config.region,
    endpoint: config.endpoint ?? undefined,
    forcePathStyle: Boolean(config.endpoint), // R2 / MinIO style endpoints
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  return client;
}

/** @type {import("./index.js").StorageDriver} */
export const s3Driver = {
  name: "s3",

  async createUploadTarget({ key, contentType, sizeBytes }) {
    const ttl = env.storage.uploadUrlTtlSeconds;
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: sizeBytes, // the browser must send exactly this many bytes
    });
    const url = await getSignedUrl(getClient(), command, {
      expiresIn: ttl,
      signableHeaders: new Set(["content-type", "content-length"]),
    });
    return {
      method: "PUT",
      url,
      headers: { "Content-Type": contentType },
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
  },

  async createDownloadUrl(key, { ttlSeconds }) {
    return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: config.bucket, Key: key }), {
      expiresIn: ttlSeconds,
    });
  },

  publicUrl(key) {
    return config.publicBaseUrl ? `${config.publicBaseUrl}/${key}` : `/api/storage/public/${key}`;
  },

  async head(key) {
    try {
      const result = await getClient().send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: key })
      );
      return { sizeBytes: result.ContentLength ?? 0, contentType: result.ContentType };
    } catch (error) {
      if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound") return null;
      throw error;
    }
  },

  async putFile(localPath, key, contentType) {
    const { size } = await stat(localPath);
    await getClient().send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: createReadStream(localPath),
        ContentLength: size,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable", // keys are versioned
      })
    );
  },

  async getToFile(key, localPath) {
    const result = await getClient().send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key })
    );
    await pipeline(result.Body, createWriteStream(localPath));
  },

  async move(fromKey, toKey) {
    await getClient().send(
      new CopyObjectCommand({
        Bucket: config.bucket,
        CopySource: `${config.bucket}/${encodeURIComponent(fromKey).replace(/%2F/g, "/")}`,
        Key: toKey,
      })
    );
    await s3Driver.remove([fromKey]);
  },

  async remove(keys) {
    const objects = keys.filter(Boolean).map((Key) => ({ Key }));
    if (objects.length === 0) return;
    await getClient().send(
      new DeleteObjectsCommand({ Bucket: config.bucket, Delete: { Objects: objects, Quiet: true } })
    );
  },
};

/**
 * Allow browsers on our web app to upload straight to the bucket (PRD CRT-3).
 * Used by `npm run storage:cors`.
 * @param {string[]} origins
 * @returns {Promise<void>}
 */
export async function applyBucketCors(origins) {
  const { PutBucketCorsCommand } = await import("@aws-sdk/client-s3");
  await getClient().send(
    new PutBucketCorsCommand({
      Bucket: config.bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["content-type", "content-length"],
            ExposeHeaders: ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );
}
