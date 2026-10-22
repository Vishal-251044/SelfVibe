/**
 * TOTP two-factor authentication (Google Authenticator, Authy …) and
 * single-use backup codes, used by the staff console (PRD ADL-2).
 */
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { env } from "../config/env.js";
import { BACKUP_CODE_COUNT } from "../config/constants.js";
import { decrypt, encrypt, generateReadableCode, hashToken } from "../utils/crypto.js";

const TOTP_CODE_PATTERN = /^\d{6}$/;
// Accept codes from the previous / next 30-second window to absorb clock drift
const CLOCK_DRIFT_TOLERANCE_SEC = 30;

/**
 * Start (or resume) authenticator enrolment for a staff member.
 * Passing the existing pending secret makes setup idempotent: repeated calls
 * (double-clicks, React Strict Mode, a refreshed page) show the same QR code
 * instead of replacing the secret the user may already have scanned.
 * @param {string} accountLabel - Shown in the authenticator app (the email)
 * @param {string|null} [existingEncryptedSecret] - Pending secret to reuse, if any
 * @returns {Promise<{ encryptedSecret: string, otpauthUrl: string, qrCodeDataUrl: string, manualKey: string }>}
 */
export async function createEnrollment(accountLabel, existingEncryptedSecret = null) {
  const secret = existingEncryptedSecret
    ? decrypt(existingEncryptedSecret, env.auth.totpEncryptionKey)
    : generateSecret();
  const otpauthUrl = generateURI({ issuer: env.auth.totpIssuer, label: accountLabel, secret });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 1,
    width: 240,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return {
    encryptedSecret: existingEncryptedSecret ?? encrypt(secret, env.auth.totpEncryptionKey),
    otpauthUrl,
    qrCodeDataUrl,
    manualKey: secret.match(/.{1,4}/g).join(" "), // grouped for easier typing
  };
}

/**
 * Check a 6-digit authenticator code.
 * @param {string} encryptedSecret - Stored, encrypted TOTP secret
 * @param {string} code - Code the user typed
 * @param {number|null} lastUsedTimeStep - Time step of the last accepted code (blocks replay)
 * @returns {Promise<{ valid: boolean, timeStep?: number }>}
 */
export async function verifyTotpCode(encryptedSecret, code, lastUsedTimeStep) {
  if (!TOTP_CODE_PATTERN.test(code)) return { valid: false };

  const secret = decrypt(encryptedSecret, env.auth.totpEncryptionKey);
  const result = await verify({
    secret,
    token: code,
    epochTolerance: CLOCK_DRIFT_TOLERANCE_SEC,
    ...(Number.isInteger(lastUsedTimeStep) && { afterTimeStep: lastUsedTimeStep }),
  });

  return result.valid ? { valid: true, timeStep: result.timeStep } : { valid: false };
}

/**
 * Normalise a backup code the way it is hashed ("abcd-efgh" → "ABCDEFGH").
 * @param {string} code
 * @returns {string}
 */
export function normaliseBackupCode(code) {
  return String(code)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Generate a fresh set of backup codes.
 * @returns {{ codes: string[], stored: { hash: string, usedAt: null }[] }}
 *   `codes` are shown to the user once; only `stored` (hashes) is saved
 */
export function generateBackupCodes() {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const raw = generateReadableCode(8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  const stored = codes.map((code) => ({
    hash: hashToken(normaliseBackupCode(code)),
    usedAt: null,
  }));
  return { codes, stored };
}

/**
 * Find an unused backup code that matches the input.
 * @param {{ hash: string, usedAt: Date|null }[]} storedCodes
 * @param {string} code - Code the user typed
 * @returns {number} Index of the matching code, or -1
 */
export function findUnusedBackupCode(storedCodes = [], code) {
  const hash = hashToken(normaliseBackupCode(code));
  return storedCodes.findIndex((entry) => entry.hash === hash && !entry.usedAt);
}
