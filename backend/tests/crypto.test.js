/**
 * Unit tests for secret encryption and 2FA backup codes.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decrypt, encrypt } from "../src/utils/crypto.js";
import {
  findUnusedBackupCode,
  generateBackupCodes,
  normaliseBackupCode,
} from "../src/services/twoFactor.service.js";

const KEY = process.env.TOTP_ENCRYPTION_KEY;

describe("AES-256-GCM secret encryption", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const first = encrypt("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", KEY);
    const second = encrypt("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", KEY);
    assert.notEqual(first, second);
    assert.equal(decrypt(first, KEY), "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
  });

  it("detects tampering", () => {
    const [iv, tag, data] = encrypt("secret", KEY).split(":");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 1;
    assert.throws(() => decrypt([iv, tag, flipped.toString("base64")].join(":"), KEY));
  });

  it("fails with the wrong key", () => {
    assert.throws(() => decrypt(encrypt("secret", KEY), "f".repeat(64)));
  });
});

describe("backup codes", () => {
  it("generates 10 unique XXXX-XXXX codes and stores only hashes", () => {
    const { codes, stored } = generateBackupCodes();
    assert.equal(codes.length, 10);
    assert.equal(new Set(codes).size, 10);
    for (const code of codes) assert.match(code, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    assert.ok(stored.every((entry) => /^[0-9a-f]{64}$/.test(entry.hash) && entry.usedAt === null));
  });

  it("matches codes case- and dash-insensitively", () => {
    const { codes, stored } = generateBackupCodes();
    assert.equal(findUnusedBackupCode(stored, codes[3]), 3);
    assert.equal(findUnusedBackupCode(stored, codes[3].toLowerCase().replace("-", "")), 3);
    assert.equal(normaliseBackupCode("ab cd-ef gh"), "ABCDEFGH");
  });

  it("does not match a used or unknown code", () => {
    const { codes, stored } = generateBackupCodes();
    stored[0].usedAt = new Date();
    assert.equal(findUnusedBackupCode(stored, codes[0]), -1);
    assert.equal(findUnusedBackupCode(stored, "ZZZZ-ZZZZ"), -1);
  });
});
