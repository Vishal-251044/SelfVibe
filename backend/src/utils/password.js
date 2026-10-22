/**
 * Password hashing with bcrypt (bcryptjs: pure-JS bcrypt, no native build step,
 * hashes are compatible with the native `bcrypt` package).
 */
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "../config/constants.js";

// Compared against when the email is unknown, so "no such user" takes as long
// as "wrong password" and response timing does not reveal registered emails.
const DUMMY_HASH = bcrypt.hashSync("selfvibe-timing-equaliser", BCRYPT_ROUNDS);

/**
 * Hash a password.
 * @param {string} password - Plain-text password
 * @returns {Promise<string>} bcrypt hash
 */
export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Check a password against a stored hash. Always does the full bcrypt work,
 * even when there is no hash, to keep timing constant.
 * @param {string} password - Plain-text password
 * @param {string|null|undefined} passwordHash - Stored hash (missing for Google-only accounts)
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, passwordHash) {
  const isMatch = await bcrypt.compare(password, passwordHash || DUMMY_HASH);
  return Boolean(passwordHash) && isMatch;
}
