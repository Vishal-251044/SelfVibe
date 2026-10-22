/**
 * Forgot / reset password (PRD AUTH-4): an emailed, single-use link that
 * expires after 30 minutes. Only the SHA-256 hash of the token is stored.
 */
import { User } from "../models/user.model.js";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../config/constants.js";
import { canSendEmail, sendEmail } from "./email.service.js";
import { revokeAllSessionsForUser } from "./session.service.js";
import { passwordChangedEmail, passwordResetEmail } from "../utils/emailTemplates.js";
import { generateRandomToken, hashToken } from "../utils/crypto.js";
import { hashPassword } from "../utils/password.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

/**
 * Send an email without making the caller wait or fail (keeps the response
 * identical whether or not the account exists). Failures are logged.
 * @param {Object} message
 * @param {string} context - For the log line
 */
function sendInBackground(message, context) {
  sendEmail(message).catch((error) =>
    logger.error({ err: error }, `[PasswordResetService] ${context} email failed`)
  );
}

/**
 * Start a password reset. Always resolves the same way so the response never
 * reveals whether an email is registered.
 * @param {string} email - Normalised email
 * @returns {Promise<void>}
 * @throws {ApiError} 503 when email cannot be sent at all (production without a provider)
 */
export async function requestPasswordReset(email) {
  if (!canSendEmail()) {
    throw new ApiError(503, "Password reset is not available right now. Please try again later.", {
      code: ERROR_CODES.NOT_CONFIGURED,
    });
  }

  const user = await User.findOne({ email });
  if (!user || user.status !== "active") {
    logger.debug("[PasswordResetService] reset requested for an unknown or inactive account");
    return;
  }

  const token = generateRandomToken(32);
  const ttlMinutes = env.auth.passwordResetTtlMinutes;
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await user.save();

  const resetUrl = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  sendInBackground(passwordResetEmail({ name: user.name, resetUrl, ttlMinutes }), "reset link");
  logger.debug(`[PasswordResetService] reset link issued userId=${user._id}`);
}

/**
 * Check that a reset link is still usable (for the reset page before the user types).
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export async function isResetTokenValid(token) {
  const exists = await User.exists({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  });
  return Boolean(exists);
}

/**
 * Set a new password from a reset link. The link stops working, the email
 * counts as verified (only its owner could open the link), and every session
 * on every device is signed out.
 * @param {{ token: string, password: string }} input
 * @returns {Promise<void>}
 * @throws {ApiError} 400 RESET_TOKEN_INVALID when the link is wrong, used or expired
 */
export async function resetPassword({ token, password }) {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpiresAt");

  if (!user) {
    throw ApiError.badRequest("This reset link is invalid or has expired. Request a new one.", {
      code: ERROR_CODES.RESET_TOKEN_INVALID,
    });
  }

  user.passwordHash = await hashPassword(password);
  user.passwordChangedAt = new Date();
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.emailVerified = true;
  await user.save();

  const revoked = await revokeAllSessionsForUser(user._id, "password_reset");
  logger.debug(
    `[PasswordResetService] password reset userId=${user._id} sessionsRevoked=${revoked}`
  );

  sendInBackground(
    passwordChangedEmail({ name: user.name, loginUrl: `${env.appUrl}/login` }),
    "password changed"
  );
}
