/**
 * Track processing job (PRD CRT-4, roadmap Day 4 "Worker job"):
 * original → validate → AAC playback copies at 64 / 128 / 256 kbps (PRD CRT-4,
 * STO-6; the original is kept) → duration → waveform → cover → publish / schedule / draft. Files stay
 * on the upload's storage pool account. Runs in the worker (or in-process in dev).
 */
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Track } from "../models/track.model.js";
import { storage } from "./storage/index.js";
import {
  audioRenditionKey,
  audioSourceKey,
  coverKey,
  splitAccountKey,
  withAccount,
} from "./storage/storageKeys.js";
import { recordStorageUsage } from "./storagePool.service.js";
import { extractWaveform, makeSquareCover, probeAudio, transcodeToAac } from "./media/ffmpeg.js";
import {
  AUDIO_RENDITIONS,
  AUDIO_UPLOAD,
  LOSSLESS_CODECS,
  STORAGE_PREFIXES,
  WAVEFORM_PEAK_COUNT,
} from "../config/constants.js";
import { logger } from "../utils/logger.js";

export const PROCESS_TRACK_MAX_ATTEMPTS = 3;

/** A problem with the file itself — retrying will not help. */
export class PermanentProcessingError extends Error {}

/**
 * Status a freshly processed track should get from its release intent.
 * @param {{ releaseIntent: string, scheduledAt: Date|null }} track
 * @param {Date} now
 * @returns {{ status: string, publishedAt: Date|null }}
 */
export function resolveReleaseStatus(track, now = new Date()) {
  if (track.releaseIntent === "draft") return { status: "unpublished", publishedAt: null };
  if (track.releaseIntent === "schedule" && track.scheduledAt && track.scheduledAt > now) {
    return { status: "scheduled", publishedAt: null };
  }
  return { status: "published", publishedAt: now };
}

/**
 * Playback copies to produce for a source. "low" and "standard" are always
 * made; "high" only when the source really has that much detail (lossless,
 * unknown bitrate, or at least the high bitrate) — re-encoding a 128 kbps
 * file at 256 kbps only doubles the storage without sounding any better.
 * @param {{ bitrateKbps?: number|null, codec?: string|null }} [probe]
 * @returns {Array<{ bitrateKbps: number, codec: string }>} Lowest first
 */
export function chooseRenditions({ bitrateKbps = null, codec = null } = {}) {
  const { low, standard, high } = AUDIO_RENDITIONS;
  const isLossless = LOSSLESS_CODECS.includes(codec) || String(codec ?? "").startsWith("pcm_");
  // Allow ~10% slack: encoders report e.g. 250 kbps for a "256 kbps" file
  const hasHighDetail = isLossless || !bitrateKbps || bitrateKbps >= high.bitrateKbps * 0.9;
  return hasHighDetail ? [low, standard, high] : [low, standard];
}

/**
 * Process one track. Throws to let the queue retry temporary failures;
 * marks the track "failed" after the last attempt or on a bad file.
 * @param {{ data: { trackId: string }, attemptsMade: number }} job
 * @returns {Promise<void>}
 */
export async function processTrackJob({ data, attemptsMade }) {
  const track = await Track.findById(data.trackId);
  if (!track) {
    logger.warn(`[TrackProcessing] track ${data.trackId} no longer exists — skipping`);
    return;
  }

  await Track.updateOne(
    { _id: track._id },
    {
      $set: {
        "processing.state": "running",
        "processing.error": null,
        "processing.attempts": attemptsMade,
      },
    }
  );

  try {
    await processTrack(track);
  } catch (error) {
    const isFinal =
      error instanceof PermanentProcessingError || attemptsMade >= PROCESS_TRACK_MAX_ATTEMPTS;
    await Track.updateOne(
      { _id: track._id },
      {
        $set: {
          "processing.state": isFinal ? "failed" : "queued",
          "processing.error":
            error instanceof PermanentProcessingError
              ? error.message
              : "Processing failed. Try again.",
        },
      }
    );
    logger.error(
      `[TrackProcessing] track ${track._id} failed (attempt ${attemptsMade}): ${error.message}`
    );
    if (!isFinal) throw error; // let the queue retry
  }
}

/**
 * The actual work, in a temporary folder that is always cleaned up.
 * @param {import("mongoose").Document} track
 * @returns {Promise<void>}
 */
async function processTrack(track) {
  const workDir = await mkdtemp(path.join(os.tmpdir(), `selfvibe-track-${track._id}-`));
  const trackId = String(track._id);
  const version = Date.now().toString(36);

  try {
    // 1. Move the upload out of incoming/ into the track's own folder (first run only)
    let sourceKey = track.audio.sourceKey;
    if (!sourceKey) throw new PermanentProcessingError("No audio file was uploaded");
    const { accountKey } = splitAccountKey(sourceKey); // everything stays on this pool account
    if (splitAccountKey(sourceKey).path.startsWith(`${STORAGE_PREFIXES.incoming}/`)) {
      const finalKey = withAccount(
        accountKey,
        audioSourceKey(trackId, path.extname(sourceKey).slice(1) || "audio")
      );
      await storage.move(sourceKey, finalKey);
      sourceKey = finalKey;
      await Track.updateOne({ _id: track._id }, { $set: { "audio.sourceKey": finalKey } });
    }

    // 2. Download and validate
    const sourcePath = path.join(workDir, `source${path.extname(sourceKey)}`);
    await storage.getToFile(sourceKey, sourcePath);
    let probe;
    try {
      probe = await probeAudio(sourcePath);
    } catch {
      throw new PermanentProcessingError("This file isn't a readable audio file");
    }
    if (probe.durationSec < 1)
      throw new PermanentProcessingError("The audio is empty or too short");
    if (probe.durationSec > AUDIO_UPLOAD.maxDurationSec) {
      throw new PermanentProcessingError("Tracks can be at most 20 minutes long");
    }

    // 3. Transcode + waveform
    const formats = [];
    for (const rendition of chooseRenditions(probe)) {
      const outputPath = path.join(workDir, `${rendition.bitrateKbps}.m4a`);
      try {
        await transcodeToAac(sourcePath, outputPath, rendition.bitrateKbps);
      } catch (error) {
        // FFmpeg failing on a local file is deterministic — retrying will not help
        logger.debug(`[TrackProcessing] transcode failed for ${trackId}: ${error.message}`);
        throw new PermanentProcessingError(
          "This file isn't a readable audio file. Re-export it as MP3, WAV, FLAC or M4A and try again."
        );
      }
      const key = withAccount(
        accountKey,
        audioRenditionKey(trackId, rendition.bitrateKbps, version)
      );
      await storage.putFile(outputPath, key, "audio/mp4");
      formats.push({ ...rendition, key, sizeBytes: (await stat(outputPath)).size });
    }
    const waveform = await extractWaveform(
      // The smallest copy is plenty for 160 bars and decodes fastest
      path.join(workDir, `${AUDIO_RENDITIONS.low.bitrateKbps}.m4a`),
      probe.durationSec,
      WAVEFORM_PEAK_COUNT
    );

    // 4. Cover: the uploaded image, else artwork embedded in the audio file
    const cover = await buildCover(
      track,
      sourcePath,
      probe.hasCoverArt,
      workDir,
      version,
      accountKey
    );
    const storedBytes =
      (await stat(sourcePath)).size +
      formats.reduce((total, format) => total + format.sizeBytes, 0);

    // 5. Save, release, and clean up replaced files
    const previousKeys = [
      ...track.audio.formats.map((format) => format.key),
      ...(cover && track.coverKey ? [track.coverKey] : []),
    ];
    const isFirstProcessing = !["published", "scheduled", "unpublished"].includes(track.status);
    const release = isFirstProcessing ? resolveReleaseStatus(track) : {};

    await Track.updateOne(
      { _id: track._id },
      {
        $set: {
          "audio.formats": formats,
          "audio.durationSec": probe.durationSec,
          "audio.waveform": waveform,
          ...(cover && { coverUrl: cover.url, coverKey: cover.key, coverSourceKey: null }),
          "processing.state": "done",
          "processing.error": null,
          "processing.finishedAt": new Date(),
          storage: { provider: storage.name, accountKey, bytes: storedBytes },
          ...release,
        },
      }
    );
    await storage.remove(
      previousKeys.filter((key) => !formats.some((format) => format.key === key))
    );
    // Pool usage between syncs: bytes changed, and one more song the first time
    await recordStorageUsage(accountKey, {
      bytes: storedBytes - (track.storage?.bytes ?? 0),
      songs: track.storage?.bytes ? 0 : 1,
    });

    logger.info(
      `[TrackProcessing] "${track.title}" ready (${probe.durationSec}s, ${formats.map((f) => f.bitrateKbps).join("/")} kbps)${release.status ? ` → ${release.status}` : ""}`
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Produce the cover for a track, if there is one.
 * @returns {Promise<{ key: string, url: string } | null>}
 */
async function buildCover(track, sourcePath, hasEmbeddedArt, workDir, version, accountKey) {
  const outputPath = path.join(workDir, "cover.webp");
  try {
    if (track.coverSourceKey) {
      const imagePath = path.join(workDir, `cover-source${path.extname(track.coverSourceKey)}`);
      await storage.getToFile(track.coverSourceKey, imagePath);
      await makeSquareCover(imagePath, outputPath);
      await storage.remove([track.coverSourceKey]);
    } else if (hasEmbeddedArt && !track.coverUrl) {
      await makeSquareCover(sourcePath, outputPath);
    } else {
      return null;
    }
  } catch (error) {
    // A bad cover should not block the music — the track just keeps the default art
    logger.warn(`[TrackProcessing] cover for track ${track._id} skipped: ${error.message}`);
    return null;
  }

  const key = withAccount(accountKey, coverKey("tracks", String(track._id), version));
  await storage.putFile(outputPath, key, "image/webp");
  return { key, url: storage.publicUrl(key) };
}
