/**
 * Staff (Owner / Admin Console) authentication — PRD §10.9.1.
 * Flow: password → 2FA challenge → (first time: enrol authenticator) → code → session.
 * Staff sessions are separate from listener sessions: 15-minute access token,
 * 8-hour refresh token, 30-minute idle timeout.
 */
import { User } from "../models/user.model.js";
import { ERROR_CODES, SESSION_KINDS } from "../config/constants.js";
import {
  signStaffAccessToken,
  signStaffChallengeToken,
  verifyStaffChallengeToken,
} from "./token.service.js";
import {
  createSession,
  revokeSession,
  revokeSessionByToken,
  rotateSession,
} from "./session.service.js";
import {
  createEnrollment,
  findUnusedBackupCode,
  generateBackupCodes,
  verifyTotpCode,
} from "./twoFactor.service.js";
import { toStaffUser } from "./user.service.js";
import { verifyPassword } from "../utils/password.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

const TWO_FACTOR_SECRET_FIELDS =
  "+twoFactorSecret +twoFactorPendingSecret +twoFactorLastTimeStep +twoFactorBackupCodes";

/** @returns {ApiError} 401 for a wrong 2FA code */
function invalidCodeError() {
  return ApiError.unauthorized(
    "That code is not valid. Check your authenticator app and try again.",
    {
      code: ERROR_CODES.TWO_FACTOR_INVALID,
    }
  );
}

/**
 * Load the staff member a challenge token belongs to.
 * @param {string} challengeToken
 * @returns {Promise<{ user: Object, purpose: "setup"|"verify" }>}
 * @throws {ApiError} 401 when the token or account is no longer valid
 */
async function loadChallenge(challengeToken) {
  const { sub, purpose } = verifyStaffChallengeToken(challengeToken);
  const user = await User.findById(sub).select(TWO_FACTOR_SECRET_FIELDS);

  if (!user || !user.staffRole || user.status !== "active") {
    throw ApiError.unauthorized("This account cannot access the console", {
      code: ERROR_CODES.NOT_STAFF,
    });
  }
  return { user, purpose };
}

/**
 * Step 1: check email + password for a staff account.
 * @param {{ email: string, password: string }} input
 * @param {{ ip?: string }} meta
 * @returns {Promise<{ step: "setup"|"verify", challengeToken: string }>}
 *   "setup" when the account has no authenticator yet (first login)
 * @throws {ApiError} 401 INVALID_CREDENTIALS, 403 NOT_STAFF / ACCOUNT_SUSPENDED
 */
export async function startStaffLogin({ email, password }, meta) {
  const user = await User.findOne({ email }).select("+passwordHash");
  const isPasswordValid = await verifyPassword(password, user?.passwordHash);

  if (!user || !isPasswordValid) {
    logger.warn(`[StaffAuthService] console login failed (invalid credentials) ip=${meta.ip}`);
    throw ApiError.unauthorized("Incorrect email or password", {
      code: ERROR_CODES.INVALID_CREDENTIALS,
    });
  }
  if (!user.staffRole) {
    logger.warn(`[StaffAuthService] non-staff account tried console login userId=${user._id}`);
    throw ApiError.forbidden("This account does not have access to the console", {
      code: ERROR_CODES.NOT_STAFF,
    });
  }
  if (user.status !== "active") {
    throw ApiError.forbidden("This account has been suspended", {
      code: ERROR_CODES.ACCOUNT_SUSPENDED,
    });
  }

  const step = user.twoFactorEnabled ? "verify" : "setup";
  return { step, challengeToken: signStaffChallengeToken(user, step) };
}

/**
 * Step 2a (first login only): create an authenticator secret and QR code.
 * The secret stays "pending" until the first valid code confirms it. Repeated
 * or concurrent calls return the same pending secret (idempotent).
 * @param {string} challengeToken
 * @returns {Promise<{ qrCodeDataUrl: string, otpauthUrl: string, manualKey: string }>}
 * @throws {ApiError} 409 when 2FA is already set up
 */
export async function beginTwoFactorSetup(challengeToken) {
  const { user, purpose } = await loadChallenge(challengeToken);
  if (purpose !== "setup" || user.twoFactorEnabled) {
    throw ApiError.conflict("Two-factor authentication is already set up for this account", {
      code: ERROR_CODES.TWO_FACTOR_STATE,
    });
  }

  let pendingSecret = user.twoFactorPendingSecret;
  if (!pendingSecret) {
    const fresh = await createEnrollment(user.email);
    // Atomic claim: only store the new secret if no other request stored one first
    const claimed = await User.updateOne(
      { _id: user._id, twoFactorPendingSecret: null },
      { $set: { twoFactorPendingSecret: fresh.encryptedSecret } }
    );
    pendingSecret =
      claimed.modifiedCount === 1
        ? fresh.encryptedSecret
        : (await User.findById(user._id).select("+twoFactorPendingSecret")).twoFactorPendingSecret;
  }

  const enrollment = await createEnrollment(user.email, pendingSecret);
  logger.info(`[StaffAuthService] 2FA enrolment started userId=${user._id}`);
  return {
    qrCodeDataUrl: enrollment.qrCodeDataUrl,
    otpauthUrl: enrollment.otpauthUrl,
    manualKey: enrollment.manualKey,
  };
}

/**
 * Step 2b: check the code and open a staff session.
 * - "setup" challenge: confirms the new authenticator and returns backup codes (shown once)
 * - "verify" challenge: accepts an authenticator code or an unused backup code
 * @param {{ challengeToken: string, code: string }} input
 * @param {{ userAgent?: string, ip?: string }} meta
 * @returns {Promise<{ staff: Object, accessToken: string, refreshToken: string, expiresAt: Date, backupCodes?: string[] }>}
 */
export async function completeTwoFactor({ challengeToken, code }, meta) {
  const { user, purpose } = await loadChallenge(challengeToken);
  let backupCodes;

  if (purpose === "setup") {
    if (user.twoFactorEnabled || !user.twoFactorPendingSecret) {
      throw ApiError.conflict("Start two-factor setup again", {
        code: ERROR_CODES.TWO_FACTOR_STATE,
      });
    }
    const result = await verifyTotpCode(user.twoFactorPendingSecret, code, null);
    if (!result.valid) throw invalidCodeError();

    const generated = generateBackupCodes();
    backupCodes = generated.codes;
    user.twoFactorSecret = user.twoFactorPendingSecret;
    user.twoFactorPendingSecret = undefined;
    user.twoFactorEnabled = true;
    user.twoFactorLastTimeStep = result.timeStep;
    user.twoFactorBackupCodes = generated.stored;
    logger.info(`[StaffAuthService] 2FA enabled userId=${user._id}`);
  } else {
    await checkVerifyCode(user, code);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const { session, refreshToken } = await createSession(user._id, SESSION_KINDS.STAFF, meta);
  logger.info(`[StaffAuthService] console login ok userId=${user._id} role=${user.staffRole}`);

  return {
    staff: toStaffUser(user),
    accessToken: signStaffAccessToken(user, session._id),
    refreshToken,
    expiresAt: session.expiresAt,
    ...(backupCodes && { backupCodes }),
  };
}

/**
 * Accept an authenticator code (replay-protected) or burn a backup code.
 * Mutates `user`; the caller saves it.
 * @param {Object} user - User with 2FA fields selected
 * @param {string} code
 * @throws {ApiError} 401 when neither matches
 */
async function checkVerifyCode(user, code) {
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw ApiError.conflict("Two-factor authentication is not set up", {
      code: ERROR_CODES.TWO_FACTOR_STATE,
    });
  }

  const totp = await verifyTotpCode(user.twoFactorSecret, code, user.twoFactorLastTimeStep);
  if (totp.valid) {
    user.twoFactorLastTimeStep = totp.timeStep;
    return;
  }

  const backupIndex = findUnusedBackupCode(user.twoFactorBackupCodes, code);
  if (backupIndex === -1) {
    logger.warn(`[StaffAuthService] invalid 2FA code userId=${user._id}`);
    throw invalidCodeError();
  }

  user.twoFactorBackupCodes[backupIndex].usedAt = new Date();
  user.markModified("twoFactorBackupCodes");
  const remaining = user.twoFactorBackupCodes.filter((entry) => !entry.usedAt).length;
  logger.warn(`[StaffAuthService] backup code used userId=${user._id} remaining=${remaining}`);
}

/**
 * Rotate the staff refresh token and issue a new access token.
 * @param {string|undefined} refreshToken - From the httpOnly cookie
 * @returns {Promise<{ staff: Object, accessToken: string, refreshToken: string, expiresAt: Date }>}
 */
export async function refreshStaffSession(refreshToken) {
  const { session, refreshToken: nextRefreshToken } = await rotateSession(
    refreshToken,
    SESSION_KINDS.STAFF
  );

  const user = await User.findById(session.userId);
  if (!user || !user.staffRole || user.status !== "active") {
    await revokeSession(session._id, "staff_access_removed");
    throw ApiError.unauthorized("Your console access has ended", {
      code: ERROR_CODES.REFRESH_INVALID,
    });
  }

  return {
    staff: toStaffUser(user),
    accessToken: signStaffAccessToken(user, session._id),
    refreshToken: nextRefreshToken,
    expiresAt: session.expiresAt,
  };
}

/**
 * End the staff session that owns this refresh token.
 * @param {string|undefined} refreshToken
 * @returns {Promise<void>}
 */
export async function logoutStaff(refreshToken) {
  await revokeSessionByToken(refreshToken, SESSION_KINDS.STAFF);
}
