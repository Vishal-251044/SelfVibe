/**
 * Unit tests for compressed audio and streaming quality: which AAC copies a
 * source gets, which copy each listener streams (plan, data saver, slow
 * internet, old MP3-only songs), the AAC encoder output, the stream request
 * validators and the byte-size helper.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, open, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { chooseRenditions } from "../src/services/trackProcessing.service.js";
import { pickStreamFormat } from "../src/services/track.service.js";
import { probeAudio, transcodeToAac } from "../src/services/media/ffmpeg.js";
import { streamBatchSchema } from "../src/validators/listening.validator.js";
import { streamQuerySchema } from "../src/validators/track.validator.js";
import { audioRenditionKey } from "../src/services/storage/storageKeys.js";
import { formatBytes } from "../src/helpers/genericFunctions.js";

const kbps = (renditions) => renditions.map((rendition) => rendition.bitrateKbps);
const format = (bitrateKbps, codec = "aac") => ({ bitrateKbps, codec, key: `k-${bitrateKbps}` });
const AAC_SET = [format(256), format(64), format(128)]; // stored order is not guaranteed
const OLD_MP3 = [format(192, "mp3")];

describe("renditions: what each upload is stored as", () => {
  it("lossless and high-bitrate sources get 64 + 128 + 256 kbps AAC", () => {
    assert.deepEqual(kbps(chooseRenditions({ codec: "flac", bitrateKbps: 900 })), [64, 128, 256]);
    assert.deepEqual(
      kbps(chooseRenditions({ codec: "pcm_s16le", bitrateKbps: 1411 })),
      [64, 128, 256]
    );
    assert.deepEqual(kbps(chooseRenditions({ codec: "mp3", bitrateKbps: 320 })), [64, 128, 256]);
    assert.ok(chooseRenditions({ codec: "mp3", bitrateKbps: 320 }).every((r) => r.codec === "aac"));
  });
  it("a low-bitrate source skips the 256 kbps copy (it would not sound better)", () => {
    assert.deepEqual(kbps(chooseRenditions({ codec: "mp3", bitrateKbps: 128 })), [64, 128]);
    assert.deepEqual(kbps(chooseRenditions({ codec: "aac", bitrateKbps: 192 })), [64, 128]);
  });
  it("encoder rounding (250 kbps for a 256 kbps file) still counts as high", () => {
    assert.deepEqual(kbps(chooseRenditions({ codec: "aac", bitrateKbps: 250 })), [64, 128, 256]);
  });
  it("an unknown bitrate keeps every copy", () => {
    assert.deepEqual(kbps(chooseRenditions({ codec: "opus", bitrateKbps: null })), [64, 128, 256]);
    assert.deepEqual(kbps(chooseRenditions()), [64, 128, 256]);
  });
  it("copies are stored as .m4a", () => {
    assert.equal(audioRenditionKey("t1", 64, "v1"), "audio/t1/v1-64.m4a");
  });
});

describe("stream quality: which copy a listener gets", () => {
  it("low → the smallest copy, for everyone", () => {
    assert.equal(pickStreamFormat(AAC_SET, "low", false).bitrateKbps, 64);
  });
  it("standard → 128 kbps", () => {
    assert.equal(pickStreamFormat(AAC_SET, "standard", true).bitrateKbps, 128);
  });
  it("high → 256 kbps only when allowed, else standard", () => {
    assert.equal(pickStreamFormat(AAC_SET, "high", true).bitrateKbps, 256);
    assert.equal(pickStreamFormat(AAC_SET, "high", false).bitrateKbps, 128);
  });
  it("a song without a 256 kbps copy gives its best for high", () => {
    assert.equal(pickStreamFormat([format(64), format(128)], "high", true).bitrateKbps, 128);
  });
  it("old songs with one 192 kbps MP3 play it for every quality", () => {
    for (const quality of ["low", "standard", "high"]) {
      assert.equal(pickStreamFormat(OLD_MP3, quality, true).bitrateKbps, 192);
    }
  });
});

describe("stream request validators", () => {
  const id = "a".repeat(24);
  it("quality defaults to auto and accepts low / standard / high", () => {
    assert.equal(streamBatchSchema.parse({ trackIds: [id] }).quality, "auto");
    for (const quality of ["auto", "low", "standard", "high"]) {
      assert.equal(streamBatchSchema.parse({ trackIds: [id], quality }).quality, quality);
      assert.equal(streamQuerySchema.parse({ quality }).quality, quality);
    }
  });
  it("rejects unknown qualities", () => {
    assert.equal(
      streamBatchSchema.safeParse({ trackIds: [id], quality: "lossless" }).success,
      false
    );
    assert.equal(streamQuerySchema.safeParse({ quality: "ultra" }).success, false);
  });
});

describe("AAC encoder (FFmpeg)", () => {
  let workDir;
  before(async () => {
    workDir = await mkdtemp(path.join(os.tmpdir(), "selfvibe-aac-test-"));
  });
  after(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("makes a small, fast-start AAC file that plays the full length", async () => {
    const sourcePath = path.join(workDir, "tone.wav");
    // 6 seconds of a stereo test tone as the "upload"
    const made = spawnSync(ffmpegPath, [
      "-y",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=6",
      "-ac",
      "2",
      sourcePath,
    ]);
    assert.equal(made.status, 0, made.stderr?.toString());

    const outputPath = path.join(workDir, "64.m4a");
    await transcodeToAac(sourcePath, outputPath, 64);
    const probe = await probeAudio(outputPath);
    assert.equal(probe.codec, "aac");
    assert.ok(Math.abs(probe.durationSec - 6) < 0.3, `duration ${probe.durationSec}`);

    // Fast start: the "moov" index comes before the audio data ("mdat")
    const handle = await open(outputPath);
    const { buffer } = await handle.read(Buffer.alloc(4096), 0, 4096, 0);
    await handle.close();
    const head = buffer.toString("latin1");
    assert.ok(head.includes("moov"), "moov atom should be at the start of the file");
    assert.ok(
      head.indexOf("moov") < (head.indexOf("mdat") === -1 ? Infinity : head.indexOf("mdat"))
    );
  });
});

describe("formatBytes", () => {
  it("formats sizes for logs and reports", () => {
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(1536), "1.5 KB");
    assert.equal(formatBytes(6 * 1024 * 1024), "6.0 MB");
    assert.equal(formatBytes(30 * 1024 ** 3), "30.0 GB");
  });
});
