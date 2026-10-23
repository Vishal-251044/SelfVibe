/**
 * Royalty-free catalog import (roadmap Day 4, PRD MUS-1 "seed catalog"):
 * fetches CC-licensed tracks from ccMixter (and Jamendo when a key is set),
 * creates official artists, uploads the audio to storage and creates tracks
 * that go through the normal processing pipeline. Already-imported tracks are
 * skipped, so it is safe to run again.
 */
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ArtistProfile } from "../../models/artistProfile.model.js";
import { Track } from "../../models/track.model.js";
import { storage } from "../storage/index.js";
import { incomingKey, withAccount } from "../storage/storageKeys.js";
import { pickStorageAccount } from "../storagePool.service.js";
import { createOfficialArtist, findArtistByName } from "../artist.service.js";
import { createTrack } from "../track.service.js";
import { AUDIO_UPLOAD, IMAGE_UPLOAD } from "../../config/constants.js";
import { logger } from "../../utils/logger.js";
import { CATALOG_SOURCES, downloadToFile } from "./catalogSources.js";
import { ccmixterProvider } from "./ccmixter.provider.js";
import { jamendoProvider } from "./jamendo.provider.js";

const PROVIDERS = [ccmixterProvider, jamendoProvider];
const DOWNLOAD_CONCURRENCY = 3;

/**
 * Collect candidate items from every available provider, spread across genres.
 * @param {number} limit - Total tracks wanted
 * @returns {Promise<Object[]>}
 */
async function collectItems(limit) {
  const providers = PROVIDERS.filter((provider) => provider.isAvailable());
  // Ask for a few extra per genre: some will already be imported or fail to download
  const perSource = Math.ceil((limit * 1.3) / CATALOG_SOURCES.length / providers.length);
  const items = [];

  for (const source of CATALOG_SOURCES) {
    for (const provider of providers) {
      try {
        const found = await provider.fetchItems(source, perSource);
        items.push(...found);
        logger.info(`[CatalogImport] ${provider.name} · ${source.genre}: ${found.length} found`);
      } catch (error) {
        logger.warn(`[CatalogImport] ${provider.name} · ${source.genre} skipped: ${error.message}`);
      }
    }
  }

  // The same upload can match two genres — keep the first
  const seen = new Set();
  return items.filter((item) => {
    const id = `${item.provider}:${item.externalId}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Find or create the official artist for an imported track.
 * @param {Object} item
 * @param {string} ownerId
 * @returns {Promise<Object>}
 */
async function resolveArtist(item, ownerId) {
  const existing = await findArtistByName(item.artistName);
  if (existing) {
    // Grow an imported artist's genres so the taste quiz can match them (max 5)
    if (!existing.userId && existing.genres.length < 5) {
      await ArtistProfile.updateOne(
        { _id: existing._id },
        { $addToSet: { genres: item.genres[0] } }
      );
    }
    return existing;
  }
  return createOfficialArtist(
    {
      stageName: item.artistName,
      genres: item.genres,
      vibes: item.vibes.slice(0, 3),
      bio: `Independent artist. Music shared under a Creative Commons licence via ${item.provider === "ccmixter" ? "ccMixter" : "Jamendo"}.`,
      socials: item.artistUrl ? { website: item.artistUrl } : undefined,
    },
    ownerId
  );
}

/**
 * Download one item, upload it to storage and create its track.
 * @param {Object} item
 * @param {string} ownerId
 * @param {string} workDir
 * @returns {Promise<Object>} The created track
 */
async function importItem(item, ownerId, workDir) {
  const owner = { staffId: ownerId };
  const audioPath = path.join(workDir, `${item.provider}-${item.externalId}.mp3`);
  await downloadToFile(item.audioUrl, audioPath, AUDIO_UPLOAD.maxBytes, item.pageUrl);
  // Imported music is Official music (PRD 10.14): it goes to the Official storage pool
  const accountKey = await pickStorageAccount("official");
  const audioKey = withAccount(accountKey, incomingKey(owner, "mp3"));
  await storage.putFile(audioPath, audioKey, "audio/mpeg");
  await rm(audioPath, { force: true });

  // Cover art (Jamendo only); a failed cover never blocks the track
  let coverKey = null;
  if (item.coverUrl) {
    const coverPath = path.join(workDir, `${item.provider}-${item.externalId}.jpg`);
    try {
      await downloadToFile(item.coverUrl, coverPath, IMAGE_UPLOAD.maxBytes);
      coverKey = withAccount(accountKey, incomingKey(owner, "jpg"));
      await storage.putFile(coverPath, coverKey, "image/jpeg");
    } catch (error) {
      coverKey = null;
      logger.debug(`[CatalogImport] cover skipped for ${item.externalId}: ${error.message}`);
    } finally {
      await rm(coverPath, { force: true });
    }
  }

  const artist = await resolveArtist(item, ownerId);
  return createTrack({
    artistId: artist._id,
    uploadedBy: ownerId,
    audioKey,
    coverKey,
    metadata: { title: item.title, genres: item.genres, vibes: item.vibes, bpm: item.bpm },
    addedVia: "admin",
    catalog: "official",
    source: "import",
    releaseIntent: "publish",
    rightsConfirmed: true,
    license: item.license,
    external: { provider: item.provider, id: item.externalId, url: item.pageUrl },
  });
}

/**
 * Import up to `limit` new tracks.
 * @param {{ limit: number, ownerId: string }} options
 * @returns {Promise<{ created: string[], skipped: number, failed: Array<{ title: string, error: string }> }>}
 */
export async function importCatalog({ limit, ownerId }) {
  const candidates = await collectItems(limit);

  // Skip anything imported on an earlier run
  const existing = await Track.find({
    "external.provider": { $in: PROVIDERS.map((provider) => provider.name) },
  })
    .select("external")
    .lean();
  const existingIds = new Set(
    existing.map((track) => `${track.external.provider}:${track.external.id}`)
  );
  const fresh = candidates.filter(
    (item) => !existingIds.has(`${item.provider}:${item.externalId}`)
  );
  const todo = fresh.slice(0, limit);

  const workDir = await mkdtemp(path.join(os.tmpdir(), "selfvibe-import-"));
  const created = [];
  const failed = [];
  try {
    // Small worker pool: a few downloads at a time
    let next = 0;
    const worker = async () => {
      while (next < todo.length) {
        const item = todo[next];
        next += 1;
        try {
          const track = await importItem(item, ownerId, workDir);
          created.push(String(track._id));
          logger.info(
            `[CatalogImport] ${created.length}/${todo.length} "${item.title}" — ${item.artistName}`
          );
        } catch (error) {
          failed.push({ title: item.title, error: error.message });
          logger.warn(`[CatalogImport] "${item.title}" failed: ${error.message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, worker));
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  return { created, skipped: candidates.length - fresh.length, failed };
}
