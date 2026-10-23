/**
 * Object storage — the single entry point the rest of the app uses.
 * The driver is chosen by STORAGE_DRIVER (default: "s3" when the bucket is
 * configured, otherwise "local" for development).
 *
 * @typedef {Object} StorageDriver
 * @property {string} name
 * @property {(input: { key: string, contentType: string, sizeBytes: number }) => Promise<{ method: string, url: string, headers: Object, expiresAt: Date }>} createUploadTarget
 * @property {(key: string, options: { ttlSeconds: number }) => Promise<string>} createDownloadUrl
 * @property {(key: string) => string} publicUrl
 * @property {(key: string) => Promise<{ sizeBytes: number } | null>} head
 * @property {(localPath: string, key: string, contentType: string) => Promise<void>} putFile
 * @property {(key: string, localPath: string) => Promise<void>} getToFile
 * @property {(fromKey: string, toKey: string) => Promise<void>} move
 * @property {(keys: string[]) => Promise<void>} remove
 */
import { env } from "../../config/env.js";
import { localDriver } from "./local.driver.js";
import { s3Driver } from "./s3.driver.js";

/** @type {StorageDriver} */
export const storage = env.storage.driver === "s3" ? s3Driver : localDriver;
