/**
 * Listener / creator authentication: register, login, refresh and logout.
 * Controllers handle cookies; this service only deals with users and sessions.
 */
import { User } from "../models/user.model.js";
import { ERROR_CODES, SESSION_KINDS } from "../config/constants.js";
import { signAccessToken } from "./token.service.js";
import {
  createSession,
  revokeSession,
  revokeSessionByToken,
  rotateSession,
} from "./session.service.js";
import { toPublicUser } from "./user.service.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

/**
 * Everything the client needs after a successful sign-in or refresh.
 * @typedef {Object} AuthResult
 * @property {Object} user - Public user
 * @property {string} accessToken - 15-minute JWT
 * @property {string} refreshToken - Opaque token for the httpOnly cookie
 * @property {Date} expiresAt - When the session (refresh token) expires
 */

/**
 * Create a session and access token for a user.
 * @param {Object} user - User document
 * @param {Object} meta - { userAgent, ip }
 * @returns {Promise<AuthResult>}
 */
async function startSession(user, meta) {
  const { session, refreshToken } = await createSession(user._id, SESSION_KINDS.USER, meta);
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(user, session._id),
    refreshToken,
    expiresAt: session.expiresAt,
  };
}

/**
 * Register a new listener account and sign them in.
 * @param {{ name: string, email: string, password: string }} input - Validated input
 * @param {Object} meta - { userAgent, ip }
 * @returns {Promise<AuthResult>}
 * @throws {ApiError} 409 EMAIL_TAKEN
 */
export async function register({ name, email, password }, meta) {
  const existing = await User.exists({ email });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists. Try logging in.", {
      code: ERROR_CODES.EMAIL_TAKEN,
      fields: { email: "This email is already registered" },
    });
  }

  // Public sign-up only ever creates listeners — never staff (PRD ADL-3)
  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    roles: ["listener"],
    lastLoginAt: new Date(),
  });

  logger.info(`[AuthService] registered userId=${user._id}`);
  return startSession(user, meta);
}

/**
 * Log in with email and password.
 * @param {{ email: string, password: string }} input - Validated input
 * @param {Object} meta - { userAgent, ip }
 * @returns {Promise<AuthResult>}
 * @throws {ApiError} 401 INVALID_CREDENTIALS, 403 ACCOUNT_SUSPENDED
 */
export async function login({ email, password }, meta) {
  const user = await User.findOne({ email }).select("+passwordHash");

  // Same message for unknown email and wrong password (no account enumeration)
  const isPasswordValid = await verifyPassword(password, user?.passwordHash);
  if (!user || !isPasswordValid) {
    logger.info(`[AuthService] login failed (invalid credentials) ip=${meta.ip}`);
    throw ApiError.unauthorized("Incorrect email or password", {
      code: ERROR_CODES.INVALID_CREDENTIALS,
    });
  }

  if (user.status === "suspended") {
    throw ApiError.forbidden("This account has been suspended. Contact support for help.", {
      code: ERROR_CODES.ACCOUNT_SUSPENDED,
    });
  }

  user.lastLoginAt = new Date();
  await user.save();

  logger.info(`[AuthService] login ok userId=${user._id}`);
  return startSession(user, meta);
}

/**
 * Rotate the refresh token and issue a new access token.
 * @param {string|undefined} refreshToken - From the httpOnly cookie
 * @returns {Promise<AuthResult>}
 * @throws {ApiError} 401 when the session is invalid, 403 when suspended
 */
export async function refresh(refreshToken) {
  const { session, refreshToken: nextRefreshToken } = await rotateSession(
    refreshToken,
    SESSION_KINDS.USER
  );

  const user = await User.findById(session.userId);
  if (!user || user.status === "suspended") {
    await revokeSession(session._id, user ? "suspended" : "user_deleted");
    throw ApiError.unauthorized("Your session has ended. Please log in again.", {
      code: ERROR_CODES.REFRESH_INVALID,
    });
  }

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(user, session._id),
    refreshToken: nextRefreshToken,
    expiresAt: session.expiresAt,
  };
}

/**
 * End the session that owns this refresh token.
 * @param {string|undefined} refreshToken
 * @returns {Promise<void>}
 */
export async function logout(refreshToken) {
  await revokeSessionByToken(refreshToken, SESSION_KINDS.USER);
}
