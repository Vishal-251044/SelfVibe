/**
 * Shared pieces of the royalty-free catalog import: which genres to fill and
 * how they map to each provider's tags, tag → vibe hints, and small HTTP
 * helpers (JSON with retries, streaming download with a size cap).
 */
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { env } from "../../config/env.js";

// Identify the importer politely to the music sites (never a personal email)
export const USER_AGENT = `SelfVibeCatalogImport/1.0 (+${env.appUrl})`;

const REQUEST_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 3;

/**
 * Genres to fill, with the provider tags that find them and default vibes.
 * Slugs must exist in scripts/data/taxonomy.js.
 */
export const CATALOG_SOURCES = [
  { genre: "pop", vibes: ["happy"], ccmixterTags: "pop", jamendoTags: "pop" },
  { genre: "hip-hop", vibes: ["gym"], ccmixterTags: "hip_hop", jamendoTags: "hiphop" },
  { genre: "lo-fi", vibes: ["chill", "code"], ccmixterTags: "downtempo", jamendoTags: "lofi" },
  { genre: "electronic", vibes: ["party"], ccmixterTags: "electronic", jamendoTags: "electronic" },
  { genre: "indie", vibes: ["travel"], ccmixterTags: "indie", jamendoTags: "indie" },
  { genre: "rock", vibes: ["gym"], ccmixterTags: "rock", jamendoTags: "rock" },
  { genre: "jazz", vibes: ["chill"], ccmixterTags: "jazz", jamendoTags: "jazz" },
  { genre: "r-and-b", vibes: ["chill"], ccmixterTags: "soul", jamendoTags: "rnb" },
  { genre: "ambient", vibes: ["sleep", "focus"], ccmixterTags: "ambient", jamendoTags: "ambient" },
  { genre: "classical", vibes: ["focus"], ccmixterTags: "classical", jamendoTags: "classical" },
];

const VIBE_HINTS = {
  chill: ["chill", "chillout", "mellow", "downtempo", "relaxed", "relaxing"],
  focus: ["instrumental", "piano", "study"],
  party: ["dance", "club", "party", "edm", "house"],
  happy: ["upbeat", "happy", "funky", "uplifting"],
  gym: ["energetic", "workout", "aggressive"],
  sleep: ["ambient", "calm", "soothing"],
};

/**
 * Vibes suggested by a provider's free-form tags.
 * @param {string[]} tags - Lower-case tags
 * @returns {string[]} Vibe slugs
 */
export function vibesFromTags(tags) {
  const tagSet = new Set(tags);
  return Object.entries(VIBE_HINTS)
    .filter(([, hints]) => hints.some((hint) => tagSet.has(hint)))
    .map(([vibe]) => vibe);
}

/**
 * Wait for a while.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET a JSON document, retrying on timeouts, 429 and 5xx.
 * @param {string} url
 * @param {Object} [headers]
 * @returns {Promise<any>}
 * @throws {Error} After the last failed attempt
 */
export async function fetchJson(url, headers = {}) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", ...headers },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${new URL(url).host}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) await wait(2000 * attempt);
    }
  }
  throw new Error(`[CatalogImport] request to ${new URL(url).host} failed: ${lastError.message}`);
}

/**
 * Download a file to disk, refusing anything larger than maxBytes.
 * @param {string} url
 * @param {string} destination - Local file path
 * @param {number} maxBytes
 * @param {string|null} [referer] - Page the file is linked from (some hosts block hotlinking)
 * @returns {Promise<{ contentType: string|null }>}
 * @throws {Error} On HTTP errors or oversized files (after retrying dropped connections)
 */
export async function downloadToFile(url, destination, maxBytes, referer = null) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await downloadOnce(url, destination, maxBytes, referer);
    } catch (error) {
      // Retry network drops only — HTTP errors and oversized files will not change
      const isPermanent = /HTTP \d|larger than/.test(error.message);
      if (isPermanent || attempt >= MAX_RETRIES) throw error;
      await wait(2000 * attempt);
    }
  }
}

/**
 * One download attempt (see downloadToFile).
 * @returns {Promise<{ contentType: string|null }>}
 */
async function downloadOnce(url, destination, maxBytes, referer) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, ...(referer && { Referer: referer }) },
    redirect: "follow",
    signal: AbortSignal.timeout(5 * 60_000),
  });
  if (!response.ok || !response.body) throw new Error(`download failed (HTTP ${response.status})`);
  const declaredSize = Number(response.headers.get("content-length"));
  if (declaredSize > maxBytes) throw new Error("file is larger than the upload limit");

  // Count bytes as they stream so a missing / wrong Content-Length cannot bypass the cap
  let received = 0;
  const source = Readable.fromWeb(response.body);
  source.on("data", (chunk) => {
    received += chunk.length;
    if (received > maxBytes) source.destroy(new Error("file is larger than the upload limit"));
  });
  await pipeline(source, createWriteStream(destination));
  return { contentType: response.headers.get("content-type") };
}
