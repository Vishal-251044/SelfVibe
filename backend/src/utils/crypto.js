/**
 * Small crypto helpers: random tokens, one-way token hashing, and AES-256-GCM
 * encryption for secrets stored in the database (e.g. TOTP secrets).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "node:crypto";

const CIPHER = "aes-256-gcm";
const IV_BYTES = 12; // recommended IV size for GCM

/**
 * Generate a URL-safe random token.
 * @param {number} [bytes=48] - Entropy in bytes
 * @returns {string} base64url string
 */
export function generateRandomToken(bytes = 48) {
  return randomBytes(bytes).toString("base64url");
}

/**
 * One-way SHA-256 hash for high-entropy tokens (refresh tokens, backup codes).
 * Only the hash is stored, so a database leak does not leak usable tokens.
 * @param {string} value
 * @returns {string} hex digest
 */
export function hashToken(value) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Generate a code from an unambiguous alphabet (no 0/O, 1/I/L).
 * @param {number} length - Number of characters
 * @returns {string} e.g. "7KQ2MXRW"
 */
export function generateReadableCode(length) {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}

/**
 * Encrypt text with AES-256-GCM.
 * @param {string} plainText
 * @param {string} hexKey - 64 hex chars (32 bytes)
 * @returns {string} "iv:authTag:cipherText", each base64
 */
export function encrypt(plainText, hexKey) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER, Buffer.from(hexKey, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(":");
}

/**
 * Decrypt a value produced by encrypt().
 * @param {string} payload - "iv:authTag:cipherText"
 * @param {string} hexKey - The same key used to encrypt
 * @returns {string} The original text
 * @throws {Error} When the payload is malformed, tampered with, or the key is wrong
 */
export function decrypt(payload, hexKey) {
  const [iv, authTag, encrypted] = String(payload)
    .split(":")
    .map((part) => Buffer.from(part, "base64"));
  if (!iv || !authTag || !encrypted) throw new Error("[Crypto] Encrypted payload is malformed");

  const decipher = createDecipheriv(CIPHER, Buffer.from(hexKey, "hex"), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
