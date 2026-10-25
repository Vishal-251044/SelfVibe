/**
 * Console account security (PRD ADL-5, roadmap Day 10 "admin security pass"):
 * - lockout: STAFF_LOCKOUT.maxFailures wrong passwords / 2FA codes in a row
 *   lock a staff account for STAFF_LOCKOUT.lockMs, from any network; the Owner
 *   and the person are emailed, and the Owner can unlock early
 * - new-device alerts: each browser gets a random device cookie; a console
 *   sign-in from a device not seen before for that account emails the Owner
 * - Owner actions on a team member: unlock, reset 2FA, sign out everywhere
 * Every event is written to the audit log.
 */
import { User } from "../models/user.model.js";
import { revokeAllSessionsForUser } from "./session.service.js";
import { canSendEmail, sendEmail } from "./email.service.js";
import { recordAudit } from "./audit.service.js";
import { staffLockedEmail, staffNewDeviceEmail } from "../utils/emailTemplates.js";
import { generateRandomToken, hashToken } from "../utils/crypto.js";
import { describeUserAgent } from "../helpers/genericFunctions.js";
import { env } from "../config/env.js";
import {
  ERROR_CODES,
  SESSION_KINDS,
  STAFF_LOCKOUT,
  STAFF_MAX_KNOWN_DEVICES,
  STAFF_ROLE_LABELS,
} from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

/**
 * Write a security event to the audit log on behalf of the staff member.
 * @param {Object} user - Staff user
 * @param {string} action - e.g. "staff.login"
 * @param {{ ip?: string, userAgent?: string }} meta
 * @param {Object} [after]
 * @returns {Promise<void>}
 */
function auditSecurityEvent(user, action, meta, after = null) {
  return recordAudit({
    staffId: user._id,
    staffRole: user.staffRole,
    action,
    targetType: "user",
    targetId: String(user._id),
    after: { device: describeUserAgent(meta.userAgent), ...after },
    method: "POST",
    path: "/api/admin/auth",
    statusCode: action === "staff.login" || action === "staff.new_device" ? 200 : 401,
    ip: meta.ip ?? null,
  });
}

/**
 * Email the Owner (and optionally others). Fire-and-forget: a failed email
 * must never block a sign-in; failures are logged.
 * @param {string[]} recipients
 * @param {{ subject: string, html: string, text: string }} message
 */
function sendSecurityEmail(recipients, message) {
  if (!canSendEmail()) return;
  for (const to of new Set(recipients.filter(Boolean))) {
    sendEmail({ to, ...message }).catch((error) =>
      logger.error(`[StaffSecurity] security email "${message.subject}" failed: ${error.message}`)
    );
  }
}

/** @returns {Promise<string|null>} The Owner's email address */
async function ownerEmail() {
  const owner = await User.findOne({ staffRole: "owner" }).select("email").lean();
  return owner?.email ?? null;
}

/**
 * Minutes left on a lock, rounded up (at least 1).
 * @param {Date} lockedUntil
 * @returns {number}
 */
function minutesLeft(lockedUntil) {
  return Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60_000));
}

/**
 * Refuse sign-in while a staff account is locked.
 * @param {{ lockedUntil?: Date|null }} user
 * @throws {ApiError} 423 ACCOUNT_LOCKED
 */
export function assertNotLocked(user) {
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const minutes = minutesLeft(user.lockedUntil);
    throw new ApiError(
      423,
      `This account is locked after too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or ask the Owner to unlock it.`,
      { code: ERROR_CODES.ACCOUNT_LOCKED, retryAfterSec: minutes * 60 }
    );
  }
}

/**
 * Count one wrong password or 2FA code for a staff account; lock it when the
 * limit is reached. The counter is updated atomically, so parallel attempts
 * can't slip past the limit.
 * @param {Object} user - Staff user (only _id, name, email, staffRole are read)
 * @param {"password"|"2fa"} step
 * @param {{ ip?: string, userAgent?: string }} meta
 * @returns {Promise<boolean>} True when this attempt locked the account
 */
export async function registerFailedAttempt(user, step, meta) {
  const updated = await User.findOneAndUpdate(
    { _id: user._id },
    { $inc: { failedLoginCount: 1 } },
    { returnDocument: "after", projection: { failedLoginCount: 1 } }
  ).lean();
  const failures = updated?.failedLoginCount ?? 0;
  await auditSecurityEvent(user, "staff.login_failed", meta, { step, failures });

  if (failures < STAFF_LOCKOUT.maxFailures) return false;

  const lockedUntil = new Date(Date.now() + STAFF_LOCKOUT.lockMs);
  await User.updateOne({ _id: user._id }, { $set: { lockedUntil, failedLoginCount: 0 } });
  await auditSecurityEvent(user, "staff.locked", meta, { lockedUntil });
  logger.warn(`[StaffSecurity] staff account locked userId=${user._id} ip=${meta.ip}`);

  sendSecurityEmail(
    [await ownerEmail(), user.email],
    staffLockedEmail({
      staffName: user.name,
      staffEmail: user.email,
      minutes: Math.round(STAFF_LOCKOUT.lockMs / 60_000),
      ip: meta.ip ?? "unknown",
      consoleUrl: `${env.appUrl}/admin/team`,
    })
  );
  return true;
}

/**
 * A successful sign-in clears the failure counter and any expired lock.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function clearFailedAttempts(userId) {
  await User.updateOne({ _id: userId }, { $set: { failedLoginCount: 0, lockedUntil: null } });
}

/**
 * After a successful console sign-in: remember this browser, and alert the
 * Owner when it's new for this account. The very first sign-in (2FA setup)
 * only records the device — there is nothing to compare it with yet.
 * @param {Object} user - Staff user
 * @param {string|undefined} deviceId - From the device cookie (may be missing)
 * @param {{ ip?: string, userAgent?: string }} meta
 * @param {{ isFirstLogin: boolean }} options
 * @returns {Promise<{ deviceId: string, isNewDevice: boolean }>} deviceId to (re)set in the cookie
 */
export async function recordStaffDevice(user, deviceId, meta, { isFirstLogin }) {
  const id = typeof deviceId === "string" && /^[\w-]{20,128}$/.test(deviceId) ? deviceId : null;
  const currentId = id ?? generateRandomToken(24);
  const hash = hashToken(currentId);
  const now = new Date();
  const label = describeUserAgent(meta.userAgent);

  const stored = await User.findById(user._id).select("+staffDevices").lean();
  const devices = stored?.staffDevices ?? [];
  const known = devices.find((device) => device.hash === hash);

  const nextDevices = known
    ? devices.map((device) =>
        device.hash === hash ? { ...device, lastSeenAt: now, ip: meta.ip ?? device.ip } : device
      )
    : [...devices, { hash, label, ip: meta.ip ?? null, firstSeenAt: now, lastSeenAt: now }];
  // Keep the most recently used devices only
  nextDevices.sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));
  await User.updateOne(
    { _id: user._id },
    { $set: { staffDevices: nextDevices.slice(0, STAFF_MAX_KNOWN_DEVICES) } }
  );

  await auditSecurityEvent(user, "staff.login", meta, { newDevice: !known });
  const isNewDevice = !known && !isFirstLogin;
  if (isNewDevice) {
    await auditSecurityEvent(user, "staff.new_device", meta);
    logger.warn(`[StaffSecurity] console sign-in from a new device userId=${user._id}`);
    sendSecurityEmail(
      [await ownerEmail()],
      staffNewDeviceEmail({
        staffName: user.name,
        staffEmail: user.email,
        roleLabel: STAFF_ROLE_LABELS[user.staffRole] ?? user.staffRole,
        device: label,
        ip: meta.ip ?? "unknown",
        at: `${now.toISOString().replace("T", " ").slice(0, 16)} UTC`,
        consoleUrl: `${env.appUrl}/admin/team`,
      })
    );
  }
  return { deviceId: currentId, isNewDevice };
}

/* ===== Owner actions from the Team page ===== */

/**
 * A team member the Owner may act on (not the Owner account itself).
 * @param {string} userId
 * @returns {Promise<Object>} Mongoose document
 */
async function requireTeamMember(userId) {
  const user = await User.findOne({ _id: userId, staffRole: { $ne: null } });
  if (!user) throw ApiError.notFound("Staff member not found", { code: ERROR_CODES.NOT_FOUND });
  if (user.staffRole === "owner") {
    throw ApiError.forbidden("The Owner account can't be changed from the Team page", {
      code: ERROR_CODES.OWNER_PROTECTED,
    });
  }
  return user;
}

/**
 * Unlock a locked console account early.
 * @param {string} userId
 * @returns {Promise<{ before: Object, after: Object }>}
 */
export async function unlockStaff(userId) {
  const user = await requireTeamMember(userId);
  const before = { lockedUntil: user.lockedUntil };
  await clearFailedAttempts(user._id);
  return { before, after: { lockedUntil: null } };
}

/**
 * Remove someone's authenticator (e.g. a lost phone). They set up 2FA again,
 * with new backup codes, at their next console sign-in. Ends their console sessions.
 * @param {string} userId
 * @returns {Promise<{ before: Object, after: Object }>}
 */
export async function resetStaffTwoFactor(userId) {
  const user = await requireTeamMember(userId);
  await User.updateOne(
    { _id: user._id },
    {
      $set: { twoFactorEnabled: false, twoFactorLastTimeStep: null },
      $unset: { twoFactorSecret: 1, twoFactorPendingSecret: 1, twoFactorBackupCodes: 1 },
    }
  );
  await revokeAllSessionsForUser(user._id, "two_factor_reset", SESSION_KINDS.STAFF);
  return {
    before: { twoFactorEnabled: user.twoFactorEnabled },
    after: { twoFactorEnabled: false },
  };
}

/**
 * End all of someone's console sessions (their listener sessions stay).
 * @param {string} userId
 * @returns {Promise<{ after: { sessionsEnded: number } }>}
 */
export async function endStaffSessions(userId) {
  const user = await requireTeamMember(userId);
  const sessionsEnded = await revokeAllSessionsForUser(
    user._id,
    "signed_out_by_owner",
    SESSION_KINDS.STAFF
  );
  return { after: { sessionsEnded } };
}
