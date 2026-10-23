/**
 * Seed starter artist profiles for the taste quiz.
 * Run with: npm run seed:artists
 *
 * - Idempotent: artists are matched by slug; existing profiles are never
 *   overwritten (edits made later in the admin console are kept).
 * - Photos: fetched from Wikipedia's page summary, and ONLY used when the file
 *   is on Wikimedia Commons (freely licensed). The credit link is stored with
 *   the photo. Artists without a free photo show initials until staff upload one.
 */
import mongoose from "mongoose";
import { env, isUnset } from "../src/config/env.js";
import { ArtistProfile } from "../src/models/artistProfile.model.js";
import { logger } from "../src/utils/logger.js";
import { ARTISTS } from "./data/artists.js";

const WIKIPEDIA_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/";
// Wikimedia throttles (HTTP 429) clients that do not identify themselves with
// contact info. SEED_CONTACT (a URL or email) is optional; the app URL is the fallback.
const SEED_CONTACT = process.env.SEED_CONTACT?.trim() || env.appUrl;
const USER_AGENT = `SelfVibeSeed/0.1 (+${SEED_CONTACT}; artist-photo seed)`;
const CONCURRENCY = 2;
const MAX_ATTEMPTS = 4;
// File names that are not a photo of the person
const NOT_A_PORTRAIT = /signature|autograph|logo|wordmark|.svg$/i;

/**
 * Wait for a number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Find a freely licensed photo for a Wikipedia page.
 * @param {string} pageTitle - e.g. "Arijit_Singh"
 * @returns {Promise<{ avatar: string, credit: { source: string, url: string } } | null>}
 *   null when there is no photo or it is not on Wikimedia Commons
 */
async function fetchCommonsPhoto(pageTitle) {
  try {
    let response;
    // Retry when throttled, honouring Retry-After (else 1s, 2s, 4s)
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      response = await fetch(WIKIPEDIA_SUMMARY + encodeURIComponent(pageTitle), {
        headers: {
          "User-Agent": USER_AGENT,
          "Api-User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (response.status !== 429 || attempt === MAX_ATTEMPTS) break;
      const retryAfterSec = Number(response.headers.get("retry-after")) || 2 ** (attempt - 1);
      await sleep(retryAfterSec * 1000);
    }
    if (!response.ok) {
      logger.warn(`[SeedArtists] photo lookup for ${pageTitle} returned HTTP ${response.status}`);
      return null;
    }

    const summary = await response.json();
    const photoUrl = summary.thumbnail?.source;
    // Files under /wikipedia/commons/ are freely licensed; /wikipedia/en/ ones may be non-free
    const match = photoUrl?.match(
      /\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)/
    );
    if (!match) return null;

    // Some lead images are signatures, logos or drawings — not photos of the artist
    const fileName = decodeURIComponent(match[1]);
    if (NOT_A_PORTRAIT.test(fileName)) {
      logger.warn(`[SeedArtists] skipped non-portrait image for ${pageTitle}: ${fileName}`);
      return null;
    }

    return {
      avatar: photoUrl.split("?")[0],
      credit: {
        source: "Wikimedia Commons",
        url: `https://commons.wikimedia.org/wiki/File:${match[1]}`,
      },
    };
  } catch (error) {
    logger.warn(`[SeedArtists] photo lookup failed for ${pageTitle}: ${error.message}`);
    return null;
  }
}

/**
 * Run async work over items with limited parallelism.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Promise<void>} worker
 * @returns {Promise<void>}
 */
async function runPool(items, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) await worker(queue.shift());
    })
  );
}

/** @returns {Promise<void>} */
async function seed() {
  if (isUnset(env.databaseUrl)) throw new Error("DATABASE_URL is not set in backend/.env");
  await mongoose.connect(env.databaseUrl, { serverSelectionTimeoutMS: 15000 });
  await ArtistProfile.init(); // make sure the unique slug index exists

  const stats = { added: 0, existing: 0, photos: 0, noFreePhoto: [] };

  await runPool(ARTISTS, async ({ wiki, ...profile }) => {
    const result = await ArtistProfile.updateOne(
      { slug: profile.slug },
      { $setOnInsert: { ...profile, userId: null, verified: false } },
      { upsert: true }
    );
    if (result.upsertedCount) stats.added += 1;
    else stats.existing += 1;

    // Only fill in a photo that is still missing (never replace staff uploads)
    const current = await ArtistProfile.findOne({ slug: profile.slug }).select("avatar").lean();
    if (current?.avatar) return;

    const photo = await fetchCommonsPhoto(wiki);
    if (!photo) {
      stats.noFreePhoto.push(profile.stageName);
      return;
    }
    await ArtistProfile.updateOne(
      { slug: profile.slug, avatar: null },
      { $set: { avatar: photo.avatar, avatarCredit: photo.credit } }
    );
    stats.photos += 1;
  });

  logger.info(
    `[SeedArtists] artists: ${stats.added} added, ${stats.existing} already there · photos added: ${stats.photos}`
  );
  if (stats.noFreePhoto.length) {
    logger.info(
      `[SeedArtists] no free photo (initials shown until staff upload one): ${stats.noFreePhoto.join(", ")}`
    );
  }
}

seed()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error(`[SeedArtists] ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
