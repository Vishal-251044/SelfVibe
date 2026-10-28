/**
 * Audio / image processing with FFmpeg (bundled via ffmpeg-static, so no
 * system install is needed). Used by the track processing job only.
 */
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const FFPROBE_PATH = ffprobeStatic.path;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const WAVEFORM_SAMPLE_RATE = 8000;

/**
 * Run a command and collect its output.
 * @param {string} command
 * @param {string[]} args
 * @param {{ timeoutMs?: number, onStdout?: (chunk: Buffer) => void }} [options]
 * @returns {Promise<{ stdout: string, stderr: string }>}
 * @throws {Error} With the tail of stderr when the command fails or times out
 */
function run(command, args, { timeoutMs = DEFAULT_TIMEOUT_MS, onStdout } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    const stdout = [];
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`[FFmpeg] ${command.split(/[\\/]/).pop()} timed out`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => (onStdout ? onStdout(chunk) : stdout.push(chunk)));
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-4000); // keep the end, where errors are
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout: Buffer.concat(stdout).toString("utf8"), stderr });
      else
        reject(
          new Error(
            `[FFmpeg] exited with code ${code}: ${stderr.trim().split("\n").slice(-3).join(" | ")}`
          )
        );
    });
  });
}

/**
 * Inspect an audio file.
 * @param {string} filePath
 * @returns {Promise<{ durationSec: number, bitrateKbps: number|null, codec: string|null, hasCoverArt: boolean }>}
 * @throws {Error} When the file is not readable audio
 */
export async function probeAudio(filePath) {
  const { stdout } = await run(FFPROBE_PATH, [
    "-v",
    "error",
    "-show_entries",
    "format=duration,bit_rate:stream=codec_type,codec_name,bit_rate",
    "-of",
    "json",
    filePath,
  ]);
  const info = JSON.parse(stdout);
  const audioStream = info.streams?.find((stream) => stream.codec_type === "audio");
  if (!audioStream) throw new Error("The file has no audio track");

  const durationSec = Number(info.format?.duration);
  const bitRate = Number(audioStream.bit_rate || info.format?.bit_rate);
  return {
    durationSec: Number.isFinite(durationSec) ? Math.round(durationSec * 10) / 10 : 0,
    bitrateKbps: Number.isFinite(bitRate) && bitRate > 0 ? Math.round(bitRate / 1000) : null,
    codec: audioStream.codec_name ?? null,
    hasCoverArt: Boolean(info.streams?.some((stream) => stream.codec_type === "video")),
  };
}

/**
 * Transcode to AAC in an M4A file (stereo, 44.1 kHz, metadata stripped).
 * "faststart" puts the index at the front, so playback starts after the first
 * few KB and seeking works with range requests, even on slow connections.
 * @param {string} inputPath
 * @param {string} outputPath - Ends with .m4a
 * @param {number} bitrateKbps - e.g. 64, 128 or 256
 * @returns {Promise<void>}
 */
export async function transcodeToAac(inputPath, outputPath, bitrateKbps) {
  await run(ffmpegPath, [
    "-y",
    "-v",
    "error",
    "-i",
    inputPath,
    "-vn",
    "-map_metadata",
    "-1",
    "-ac",
    "2",
    "-ar",
    "44100",
    "-codec:a",
    "aac",
    "-b:a",
    `${bitrateKbps}k`,
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

/**
 * Compute waveform peaks (0–1) for the player, from mono 8 kHz PCM.
 * @param {string} inputPath
 * @param {number} durationSec
 * @param {number} peakCount - Number of bars
 * @returns {Promise<number[]>}
 */
export async function extractWaveform(inputPath, durationSec, peakCount) {
  const totalSamples = Math.max(1, Math.ceil(durationSec * WAVEFORM_SAMPLE_RATE));
  const samplesPerPeak = Math.max(1, Math.ceil(totalSamples / peakCount));
  const peaks = new Array(peakCount).fill(0);
  let sampleIndex = 0;
  let leftover = null; // an odd byte carried between chunks

  await run(
    ffmpegPath,
    [
      "-v",
      "error",
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      String(WAVEFORM_SAMPLE_RATE),
      "-f",
      "s16le",
      "-",
    ],
    {
      onStdout: (chunk) => {
        const data = leftover ? Buffer.concat([leftover, chunk]) : chunk;
        const usable = data.length - (data.length % 2);
        leftover = usable < data.length ? data.subarray(usable) : null;
        for (let offset = 0; offset < usable; offset += 2) {
          const bucket = Math.min(peakCount - 1, Math.floor(sampleIndex / samplesPerPeak));
          const amplitude = Math.abs(data.readInt16LE(offset)) / 32768;
          if (amplitude > peaks[bucket]) peaks[bucket] = amplitude;
          sampleIndex += 1;
        }
      },
    }
  );

  // Normalise so the loudest bar is 1, rounded to keep documents small
  const loudest = Math.max(...peaks, 0.0001);
  return peaks.map((peak) => Math.round((peak / loudest) * 100) / 100);
}

/**
 * Resize / crop an image into a square WebP cover.
 * @param {string} inputPath - Image file, or an audio file with embedded artwork
 * @param {string} outputPath - Ends with .webp
 * @param {number} [size=600]
 * @returns {Promise<void>}
 */
export async function makeSquareCover(inputPath, outputPath, size = 600) {
  await run(ffmpegPath, [
    "-y",
    "-v",
    "error",
    "-i",
    inputPath,
    "-an",
    "-frames:v",
    "1",
    "-vf",
    `scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size}`,
    "-c:v",
    "libwebp",
    "-quality",
    "82",
    outputPath,
  ]);
}
