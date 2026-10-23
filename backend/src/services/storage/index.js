/**
 * Object storage — the single entry point the rest of the app uses.
 * The driver is chosen by STORAGE_DRIVER (default: "cloudinary" — the storage
 * pool of PRD 10.13 — when Cloudinary accounts are set; "s3" (R2) is a spare
 * option; "local" is for development without any account).
 *
 * @typedef {Object} StorageDriver
 * @property {string} name
 * @property {(input: { key: string, contentType: string, sizeBytes: number }) => Promise<{ method: string, url: string, headers: Object, fields?: Object, expiresAt: Date }>} createUploadTarget
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
import { cloudinaryDriver } from "./cloudinary.driver.js";

const DRIVERS = { cloudinary: cloudinaryDriver, s3: s3Driver, local: localDriver };

/** @type {StorageDriver} */
export const storage = DRIVERS[env.storage.driver] ?? localDriver;

/** Whether files go to the Cloudinary storage pool (keys carry the pool account). */
export const usesStoragePool = storage === cloudinaryDriver;
