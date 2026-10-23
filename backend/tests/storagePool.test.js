/**
 * Unit tests for the Cloudinary storage pool (PRD 10.13): account picking,
 * the 85% "full" line, key → Cloudinary location mapping, request signing
 * and storage keys with pool accounts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chooseAccount, isOverFullLine } from "../src/services/storagePool.service.js";
import { signParams } from "../src/services/storage/cloudinary.driver.js";
import {
  incomingKey,
  isIncomingKeyOwnedBy,
  splitAccountKey,
  withAccount,
} from "../src/services/storage/storageKeys.js";
import { creatorCreateTrackSchema } from "../src/validators/track.validator.js";

const GB = 1024 ** 3;
const account = (key, pool, usedGb, status = "active", quotaGb = 10) => ({
  key,
  pool,
  status,
  quotaBytes: quotaGb * GB,
  bytesUsed: usedGb * GB,
});

describe("storage pool: account picker", () => {
  const accounts = [
    account("off1", "official", 6),
    account("off2", "official", 2),
    account("com1", "community", 1),
  ];

  it("picks the account with the most free space in the right pool", () => {
    assert.equal(chooseAccount(accounts, "official").key, "off2");
    assert.equal(chooseAccount(accounts, "community").key, "com1");
  });

  it("never puts community uploads in the official pool (and the other way round)", () => {
    assert.equal(chooseAccount([account("off1", "official", 0)], "community"), null);
    assert.equal(chooseAccount([account("com1", "community", 0)], "official"), null);
  });

  it("shared accounts serve both pools", () => {
    const shared = [account("main", "shared", 1)];
    assert.equal(chooseAccount(shared, "official").key, "main");
    assert.equal(chooseAccount(shared, "community").key, "main");
  });

  it("skips full (>= 85%) and paused accounts automatically", () => {
    const pool = [
      account("off1", "official", 8.6), // 86% — over the line
      account("off2", "official", 1, "paused"),
      account("off3", "official", 1, "full"),
      account("off4", "official", 8),
    ];
    assert.equal(chooseAccount(pool, "official").key, "off4");
    assert.equal(chooseAccount(pool.slice(0, 3), "official"), null);
  });

  it("the full line uses storage share or Cloudinary's own credit usage", () => {
    assert.equal(isOverFullLine(8.4 * GB, 10 * GB), false);
    assert.equal(isOverFullLine(8.5 * GB, 10 * GB), true);
    assert.equal(isOverFullLine(1 * GB, 10 * GB, 90), true);
  });
});

describe("storage keys with pool accounts", () => {
  const owner = { userId: "64b000000000000000000001" };

  it("adds and reads the account prefix", () => {
    const key = withAccount("com1", incomingKey(owner, "mp3"));
    assert.match(key, /^com1\/incoming\/u-64b000000000000000000001\/.+\.mp3$/);
    assert.deepEqual(splitAccountKey("com1/audio/x/source.mp3"), {
      accountKey: "com1",
      path: "audio/x/source.mp3",
    });
    assert.deepEqual(splitAccountKey("audio/x/source.mp3"), {
      accountKey: null,
      path: "audio/x/source.mp3",
    });
    assert.equal(withAccount(null, "audio/x.mp3"), "audio/x.mp3");
  });

  it("ownership check works with and without an account", () => {
    const key = withAccount("com1", incomingKey(owner, "mp3"));
    assert.equal(isIncomingKeyOwnedBy(key, owner), true);
    assert.equal(isIncomingKeyOwnedBy(key, { userId: "64b000000000000000000002" }), false);
  });

  it("validators accept pool keys", () => {
    const key = withAccount("com1", incomingKey(owner, "m4a"));
    const result = creatorCreateTrackSchema.safeParse({
      title: "Song",
      genres: ["pop"],
      audioKey: key,
      rightsConfirmed: true,
    });
    assert.equal(result.success, true);
  });
});

describe("cloudinary signing", () => {
  it("matches Cloudinary's documented algorithm (sorted params + secret, SHA-1)", () => {
    // Example from Cloudinary's "Generating authentication signatures" docs
    const signature = signParams(
      {
        eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
        public_id: "sample_image",
        timestamp: 1315060510,
      },
      "abcd"
    );
    const expected = createHash("sha1")
      .update(
        "eager=w_400,h_300,c_pad|w_260,h_200,c_crop&public_id=sample_image&timestamp=1315060510abcd"
      )
      .digest("hex");
    assert.equal(signature, expected);
    assert.equal(signature, "bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("leaves out empty parameters", () => {
    assert.equal(signParams({ a: "1", b: "", c: null }, "s"), signParams({ a: "1" }, "s"));
  });
});
