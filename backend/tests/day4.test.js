/**
 * Unit tests for Day 4: storage keys, release rules, rendition choice, bulk
 * CSV parsing, upload validation, local storage tokens and audit snapshots.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  incomingKey,
  isIncomingKeyOwnedBy,
  isPublicKey,
} from "../src/services/storage/storageKeys.js";
import { resolveKeyPath, verifyToken, localDriver } from "../src/services/storage/local.driver.js";
import { resolveReleaseStatus } from "../src/services/trackProcessing.service.js";
import {
  normaliseFileName,
  parseBulkCsv,
  titleFromFileName,
} from "../src/services/bulkImport.service.js";
import { signUpload } from "../src/services/mediaUpload.service.js";
import { toAuditSnapshot } from "../src/services/audit.service.js";
import { adminCreateTrackSchema, bulkUploadSchema } from "../src/validators/track.validator.js";

const USER = { userId: "64b000000000000000000001" };
const STAFF = { staffId: "64b0000000000000000000aa" };

describe("storage keys", () => {
  it("incoming keys belong only to their uploader", () => {
    const key = incomingKey(USER, "mp3");
    assert.match(key, /^incoming\/u-64b000000000000000000001\/[0-9a-f-]{36}\.mp3$/);
    assert.equal(isIncomingKeyOwnedBy(key, USER), true);
    assert.equal(isIncomingKeyOwnedBy(key, { userId: "64b000000000000000000002" }), false);
    assert.equal(isIncomingKeyOwnedBy(key, STAFF), false);
    assert.equal(isIncomingKeyOwnedBy("incoming/u-64b000000000000000000001/../../x", USER), false);
  });

  it("only cover images are public", () => {
    assert.equal(isPublicKey("covers/tracks/abc-1.webp"), true);
    assert.equal(isPublicKey("audio/abc/1-128.mp3"), false);
    assert.equal(isPublicKey("covers/../audio/abc/1-128.mp3"), false);
  });

  it("local storage never resolves outside its folder", () => {
    assert.throws(() => resolveKeyPath("../../etc/passwd"));
    assert.ok(
      resolveKeyPath("audio/a/b.mp3").endsWith(["audio", "a", "b.mp3"].join(require_sep()))
    );
  });

  it("local upload / download tokens are bound to their operation", async () => {
    const target = await localDriver.createUploadTarget({
      key: "incoming/x.mp3",
      contentType: "audio/mpeg",
      sizeBytes: 10,
    });
    const token = decodeURIComponent(target.url.split("token=")[1]);
    assert.equal(verifyToken(token, "put").key, "incoming/x.mp3");
    assert.throws(() => verifyToken(token, "get"));
    assert.throws(() => verifyToken("tampered", "put"));
  });
});

/** Path separator for the current OS (tests run on Windows and Linux). */
function require_sep() {
  return process.platform === "win32" ? "\\" : "/";
}

describe("release rules", () => {
  const now = new Date("2026-10-25T10:00:00Z");
  it("publish → published now", () => {
    assert.deepEqual(resolveReleaseStatus({ releaseIntent: "publish" }, now), {
      status: "published",
      publishedAt: now,
    });
  });
  it("future schedule → scheduled; past schedule → published", () => {
    const future = new Date("2026-10-26T10:00:00Z");
    assert.equal(
      resolveReleaseStatus({ releaseIntent: "schedule", scheduledAt: future }, now).status,
      "scheduled"
    );
    const past = new Date("2026-10-24T10:00:00Z");
    assert.equal(
      resolveReleaseStatus({ releaseIntent: "schedule", scheduledAt: past }, now).status,
      "published"
    );
  });
  it("draft → unpublished", () => {
    assert.equal(resolveReleaseStatus({ releaseIntent: "draft" }, now).status, "unpublished");
  });
});

describe("bulk upload CSV", () => {
  it("parses flexible headers, lists and booleans", () => {
    const csv = [
      "File Name,Title,Artist,Album,Genres,Vibes,Mood,Language,Explicit",
      'song-one.mp3,Song One,Lo-fi Lata,Night Tapes,"Lo-fi; Indie",chill|code,Calm,Hindi,yes',
      "song-two.wav,,,,,,,,",
    ].join("\n");
    const { rows, errors } = parseBulkCsv(csv);
    assert.deepEqual(errors, []);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], {
      row: 1,
      fileName: "song-one.mp3",
      title: "Song One",
      artist: "Lo-fi Lata",
      album: "Night Tapes",
      genres: ["lo-fi", "indie"],
      vibes: ["chill", "code"],
      mood: "calm",
      language: "hindi",
      explicit: true,
    });
    assert.equal(rows[1].title, undefined);
    assert.equal(rows[1].explicit, false);
  });

  it("handles a byte-order mark and reports rows without a file name", () => {
    const csv = `${String.fromCharCode(0xfeff)}file_name,title\n,No file\nok.mp3,Fine`;
    const { rows, errors } = parseBulkCsv(csv);
    assert.equal(rows.length, 1);
    assert.match(errors[0], /Row 1: missing file_name/);
  });

  it("empty CSV is fine (files only)", () => {
    assert.deepEqual(parseBulkCsv(""), { rows: [], errors: [] });
    assert.deepEqual(parseBulkCsv(null), { rows: [], errors: [] });
  });

  it("matches files regardless of case, folder and extension", () => {
    assert.equal(normaliseFileName("Music/Song-One.MP3"), "song-one");
    assert.equal(normaliseFileName("song-one.wav"), normaliseFileName("SONG-ONE.mp3"));
    assert.equal(titleFromFileName("my_song-final.mp3"), "My song final");
  });
});

describe("upload signing", () => {
  it("rejects unsupported types and oversized files", async () => {
    await assert.rejects(
      signUpload(USER, { kind: "audio", contentType: "video/mp4", sizeBytes: 100 }),
      {
        statusCode: 400,
      }
    );
    await assert.rejects(
      signUpload(USER, { kind: "audio", contentType: "audio/mpeg", sizeBytes: 51 * 1024 * 1024 }),
      { statusCode: 400 }
    );
    await assert.rejects(
      signUpload(USER, { kind: "image", contentType: "audio/mpeg", sizeBytes: 100 }),
      {
        statusCode: 400,
      }
    );
  });

  it("signs an upload for the owner's own folder", async () => {
    const result = await signUpload(USER, {
      kind: "audio",
      contentType: "audio/flac",
      sizeBytes: 1000,
    });
    assert.match(result.key, /^incoming\/u-64b000000000000000000001\/.+\.flac$/);
    assert.equal(result.upload.method, "PUT");
    assert.equal(result.upload.headers["Content-Type"], "audio/flac");
  });
});

describe("validators", () => {
  const base = {
    title: "Song",
    genres: ["pop"],
    artistId: "64b000000000000000000009",
    audioKey: "incoming/s-64b0000000000000000000aa/123e4567-e89b-12d3-a456-426614174000.mp3",
  };
  it("a scheduled release needs a future time", () => {
    assert.equal(
      adminCreateTrackSchema.safeParse({ ...base, releaseIntent: "schedule" }).success,
      false
    );
    assert.equal(
      adminCreateTrackSchema.safeParse({
        ...base,
        releaseIntent: "schedule",
        scheduledAt: "2020-01-01T00:00:00Z",
      }).success,
      false
    );
    const future = new Date(Date.now() + 86_400_000).toISOString();
    assert.equal(
      adminCreateTrackSchema.safeParse({ ...base, releaseIntent: "schedule", scheduledAt: future })
        .success,
      true
    );
  });
  it("audio keys must look like issued upload keys (no arbitrary paths)", () => {
    assert.equal(
      adminCreateTrackSchema.safeParse({ ...base, audioKey: "audio/other/source.mp3" }).success,
      false
    );
    assert.equal(
      adminCreateTrackSchema.safeParse({ ...base, audioKey: "../../etc/passwd" }).success,
      false
    );
  });
  it("bulk upload allows 1–50 files", () => {
    const file = { fileName: "a.mp3", audioKey: base.audioKey };
    assert.equal(bulkUploadSchema.safeParse({ files: [] }).success, false);
    assert.equal(bulkUploadSchema.safeParse({ files: Array(51).fill(file) }).success, false);
    assert.equal(
      bulkUploadSchema.safeParse({
        files: Array.from({ length: 50 }, (_, i) => ({
          fileName: `${i}.mp3`,
          audioKey: base.audioKey.replace(
            "4000",
            String(4000 + i)
              .padStart(4, "0")
              .slice(-4)
          ),
        })),
      }).success,
      true
    );
  });
});

describe("audit snapshots", () => {
  it("never store secrets or bulky fields", () => {
    const snapshot = toAuditSnapshot({
      title: "Song",
      passwordHash: "x",
      twoFactorSecret: "y",
      lyrics: "long",
      audio: { durationSec: 10, waveform: [0.1, 0.2] },
    });
    assert.deepEqual(snapshot, { title: "Song", audio: { durationSec: 10 } });
  });
});
