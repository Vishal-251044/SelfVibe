/**
 * JWT access tokens and refresh token generation.
 * - User access tokens and staff access tokens use different secrets AND
 *   audiences, so one can never be accepted in place of the other.
 * - 2FA challenge tokens are short-lived and only prove "password was correct".
 */
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import {
  ERROR_CODES,
  TOKEN_AUDIENCE,
  TOKEN_ISSUER,
  TWO_FACTOR_CHALLENGE_TTL,
} from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { generateRandomToken, hashToken } from "../utils/crypto.js";

const ALGORITHM = "HS256";

/**
 * Sign a JWT.
 * @param {Object} payload - Claims (sub is set separately)
 * @param {Object} options
 * @param {string} options.subject - User id
 * @param {string} options.secret
 * @param {string} options.audience
 * @param {string} options.expiresIn - e.g. "15m"
 * @returns {string}
 */
function sign(payload, { subject, secret, audience, expiresIn }) {
  return jwt.sign(payload, secret, {
    algorithm: ALGORITHM,
    subject: String(subject),
    audience,
    issuer: TOKEN_ISSUER,
    expiresIn,
  });
}

/**
 * Verify a JWT and map library errors to 401 ApiErrors with a code.
 * @param {string} token
 * @param {string} secret
 * @param {string} audience
 * @returns {Object} Decoded claims
 * @throws {ApiError} 401 TOKEN_EXPIRED or TOKEN_INVALID
 */
function verify(token, secret, audience) {
  try {
    return jwt.verify(token, secret, {
      algorithms: [ALGORITHM],
      audience,
      issuer: TOKEN_ISSUER,
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized("Your session token has expired", {
        code: ERROR_CODES.TOKEN_EXPIRED,
      });
    }
    throw ApiError.unauthorized("Invalid or malformed token", { code: ERROR_CODES.TOKEN_INVALID });
  }
}

/**
 * Sign a 15-minute access token for a listener / creator.
 * @param {{ _id: any, roles: string[] }} user
 * @param {string} sessionId
 * @returns {string}
 */
export function signAccessToken(user, sessionId) {
  return sign(
    { sid: String(sessionId), roles: user.roles },
    {
      subject: user._id,
      secret: env.auth.jwtSecret,
      audience: TOKEN_AUDIENCE.USER,
      expiresIn: env.auth.accessTokenTtl,
    }
  );
}

/**
 * Verify a listener / creator access token.
 * @param {string} token
 * @returns {{ sub: string, sid: string, roles: string[] }}
 * @throws {ApiError} 401
 */
export function verifyAccessToken(token) {
  return verify(token, env.auth.jwtSecret, TOKEN_AUDIENCE.USER);
}

/**
 * Sign a 15-minute access token for a staff member.
 * @param {{ _id: any, staffRole: string }} user
 * @param {string} sessionId
 * @returns {string}
 */
export function signStaffAccessToken(user, sessionId) {
  return sign(
    { sid: String(sessionId), staffRole: user.staffRole },
    {
      subject: user._id,
      secret: env.auth.staffJwtSecret,
      audience: TOKEN_AUDIENCE.STAFF,
      expiresIn: env.auth.staffAccessTokenTtl,
    }
  );
}

/**
 * Verify a staff access token.
 * @param {string} token
 * @returns {{ sub: string, sid: string, staffRole: string }}
 * @throws {ApiError} 401
 */
export function verifyStaffAccessToken(token) {
  return verify(token, env.auth.staffJwtSecret, TOKEN_AUDIENCE.STAFF);
}

/**
 * Sign a 5-minute token proving the staff password step passed.
 * @param {{ _id: any }} user
 * @param {"setup"|"verify"} purpose - Enrol a new authenticator, or check a code
 * @returns {string}
 */
export function signStaffChallengeToken(user, purpose) {
  return sign(
    { purpose },
    {
      subject: user._id,
      secret: env.auth.staffJwtSecret,
      audience: TOKEN_AUDIENCE.STAFF_CHALLENGE,
      expiresIn: TWO_FACTOR_CHALLENGE_TTL,
    }
  );
}

/**
 * Verify a 2FA challenge token.
 * @param {string} token
 * @returns {{ sub: string, purpose: "setup"|"verify" }}
 * @throws {ApiError} 401 when expired or invalid
 */
export function verifyStaffChallengeToken(token) {
  try {
    return verify(token, env.auth.staffJwtSecret, TOKEN_AUDIENCE.STAFF_CHALLENGE);
  } catch {
    throw ApiError.unauthorized("Your sign-in step has expired. Please log in again.", {
      code: ERROR_CODES.TOKEN_EXPIRED,
    });
  }
}

/**
 * Create a new opaque refresh token and the hash to store.
 * @returns {{ token: string, tokenHash: string }}
 */
export function generateRefreshToken() {
  const token = generateRandomToken();
  return { token, tokenHash: hashToken(token) };
}
