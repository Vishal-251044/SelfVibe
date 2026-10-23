/**
 * Track processing job (PRD CRT-4, roadmap Day 4 "Worker job"):
 * original → validate → transcode 128 / 320 kbps MP3 → duration → waveform →
 * cover → publish / schedule / draft. Runs in the worker (or in-process in dev).
 */
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Track } from "../models/track.model.js";
import { storage } from "./storage/index.js";
import { audioRenditionKey, audioSourceKey, coverKey } from "./storage/storageKeys.js";
import { extractWaveform, makeSquareCover, probeAudio, transcodeToMp3 } from "./media/ffmpeg.js";
import {
  AUDIO_RENDITIONS,
  AUDIO_UPLOAD,
  HIGH_RENDITION_MIN_SOURCE_KBPS,
  STORAGE_PREFIXES,
  WAVEFORM_PEAK_COUNT,
} from "../config/constants.js";
import { logger } from "../utils/logger.js";

export const PROCESS_TRACK_MAX_ATTEMPTS = 3;
const LOSSLESS_CODECS = /^(flac|alac|pcm_)/;

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
 * Which renditions to produce for a source (never upscale a low-bitrate file).
 * @param {{ bitrateKbps: number|null, codec: string|null }} probe
 * @returns {Array<{ bitrateKbps: number, codec: string }>}
 */
export function chooseRenditions(probe) {
  const renditions = [AUDIO_RENDITIONS.standard];
  const isLossless = LOSSLESS_CODECS.test(probe.codec ?? "");
  if (isLossless || (probe.bitrateKbps ?? 0) >= HIGH_RENDITION_MIN_SOURCE_KBPS) {
    renditions.push(AUDIO_RENDITIONS.high);
  }
  return renditions;
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
    if (sourceKey.startsWith(`${STORAGE_PREFIXES.incoming}/`)) {
      const finalKey = audioSourceKey(trackId, path.extname(sourceKey).slice(1) || "audio");
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
      const outputPath = path.join(workDir, `${rendition.bitrateKbps}.mp3`);
      try {
        await transcodeToMp3(sourcePath, outputPath, rendition.bitrateKbps);
      } catch (error) {
        // FFmpeg failing on a local file is deterministic — retrying will not help
        logger.debug(`[TrackProcessing] transcode failed for ${trackId}: ${error.message}`);
        throw new PermanentProcessingError(
          "This file isn't a readable audio file. Re-export it as MP3, WAV or FLAC and try again."
        );
      }
      const key = audioRenditionKey(trackId, rendition.bitrateKbps, version);
      await storage.putFile(outputPath, key, "audio/mpeg");
      formats.push({ ...rendition, key, sizeBytes: (await stat(outputPath)).size });
    }
    const waveform = await extractWaveform(
      path.join(workDir, `${AUDIO_RENDITIONS.standard.bitrateKbps}.mp3`),
      probe.durationSec,
      WAVEFORM_PEAK_COUNT
    );

    // 4. Cover: the uploaded image, else artwork embedded in the audio file
    const cover = await buildCover(track, sourcePath, probe.hasCoverArt, workDir, version);

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
          ...release,
        },
      }
    );
    await storage.remove(
      previousKeys.filter((key) => !formats.some((format) => format.key === key))
    );

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
async function buildCover(track, sourcePath, hasEmbeddedArt, workDir, version) {
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

  const key = coverKey("tracks", String(track._id), version);
  await storage.putFile(outputPath, key, "image/webp");
  return { key, url: storage.publicUrl(key) };
}
