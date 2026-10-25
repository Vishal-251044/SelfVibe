/**
 * Team (PRD 10.9.2 Team, ADL-3/8, roadmap Day 9 — Owner only): list staff,
 * invite by email with a role, change roles and remove console access.
 * - invites carry a one-time token (only its hash is stored), valid 7 days
 * - accepting an invite either upgrades an existing SelfVibe account (after
 *   its password is confirmed) or creates one; 2FA is set up at first console login
 * - the Owner account can never be changed or removed, and nobody can
 *   become Owner through the Team page
 */
import { StaffInvite } from "../../models/staffInvite.model.js";
import { User } from "../../models/user.model.js";
import { revokeAllSessionsForUser } from "../session.service.js";
import { canSendEmail, sendEmail } from "../email.service.js";
import { recordAudit } from "../audit.service.js";
import { staffInviteEmail } from "../../utils/emailTemplates.js";
import { generateRandomToken, hashToken } from "../../utils/crypto.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { ERROR_CODES, STAFF_INVITE_TTL_MS } from "../../config/constants.js";
import { logger } from "../../utils/logger.js";

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  contentManager: "Content Manager",
  moderator: "Moderator",
};

/**
 * Staff member as the Team page shows them.
 * @param {Object} user - Lean
 * @returns {Object}
 */
function toTeamMember(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? null,
    staffRole: user.staffRole,
    status: user.status,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    lastLoginAt: user.lastLoginAt ?? null,
    isOwner: user.staffRole === "owner",
  };
}

/**
 * @param {Object} invite - Lean
 * @returns {Object}
 */
function toInviteView(invite) {
  return {
    id: String(invite._id),
    email: invite.email,
    staffRole: invite.staffRole,
    status: invite.status,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
}

/** @returns {Promise<{ members: Object[], invites: Object[] }>} */
export async function listTeam() {
  const [members, invites] = await Promise.all([
    User.find({ staffRole: { $ne: null } })
      .sort({ createdAt: 1 })
      .lean(),
    StaffInvite.find({ status: "pending", expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  // Owner first, then by role
  const rank = { owner: 0, admin: 1, contentManager: 2, moderator: 3 };
  members.sort((a, b) => rank[a.staffRole] - rank[b.staffRole]);
  return { members: members.map(toTeamMember), invites: invites.map(toInviteView) };
}

/**
 * Invite someone by email.
 * @param {{ email: string, staffRole: string }} input
 * @param {{ staffId: string, name: string }} inviter
 * @returns {Promise<{ invite: Object, emailSent: boolean, acceptUrl: string|null }>}
 *   acceptUrl is returned only when email can't be sent, so the Owner can share it
 * @throws {ApiError} 409 when the person is already staff
 */
export async function inviteStaff({ email, staffRole }, inviter) {
  const existing = await User.findOne({ email }).select("staffRole").lean();
  if (existing?.staffRole) {
    throw ApiError.conflict(`${email} is already on the team`, {
      code: ERROR_CODES.ALREADY_EXISTS,
    });
  }
  await StaffInvite.updateMany({ email, status: "pending" }, { $set: { status: "revoked" } });

  const token = generateRandomToken(32);
  const invite = await StaffInvite.create({
    email,
    staffRole,
    tokenHash: hashToken(token),
    invitedBy: inviter.staffId,
    expiresAt: new Date(Date.now() + STAFF_INVITE_TTL_MS),
  });
  const acceptUrl = `${env.appUrl}/admin/invite/${encodeURIComponent(token)}`;
  // Only a real email provider delivers it; otherwise (dev mailbox / no provider)
  // the Owner gets the link back to share by hand
  const emailSent = env.email.isConfigured;
  if (canSendEmail()) {
    sendEmail({
      to: email,
      ...staffInviteEmail({
        inviterName: inviter.name,
        roleLabel: ROLE_LABELS[staffRole],
        acceptUrl,
        ttlDays: Math.round(STAFF_INVITE_TTL_MS / 86_400_000),
      }),
    }).catch((error) => logger.error(`[Team] invite email to ${email} failed: ${error.message}`));
  }
  logger.info(`[Team] invited ${email} as ${staffRole}`);
  return {
    invite: toInviteView(invite.toObject()),
    emailSent,
    acceptUrl: emailSent ? null : acceptUrl,
  };
}

/**
 * A pending, unexpired invite by its token, or 404.
 * @param {string} token
 * @returns {Promise<Object>} Mongoose document
 */
async function requireInvite(token) {
  const invite = await StaffInvite.findOne({
    tokenHash: hashToken(String(token)),
    status: "pending",
  });
  if (!invite || invite.expiresAt <= new Date()) {
    throw ApiError.notFound("This invite link is invalid or has expired", {
      code: ERROR_CODES.INVITE_INVALID,
    });
  }
  return invite;
}

/**
 * What the invite page shows before accepting (public).
 * @param {string} token
 * @returns {Promise<{ email: string, staffRole: string, roleLabel: string, hasAccount: boolean, inviterName: string }>}
 */
export async function getInvite(token) {
  const invite = await requireInvite(token);
  const [account, inviter] = await Promise.all([
    User.exists({ email: invite.email }),
    User.findById(invite.invitedBy).select("name").lean(),
  ]);
  return {
    email: invite.email,
    staffRole: invite.staffRole,
    roleLabel: ROLE_LABELS[invite.staffRole],
    hasAccount: Boolean(account),
    inviterName: inviter?.name ?? "The SelfVibe Owner",
  };
}

/**
 * Accept an invite (public). Existing accounts confirm their password;
 * new people choose a name and password.
 * @param {string} token
 * @param {{ name?: string, password: string }} input
 * @param {{ ip?: string }} meta
 * @returns {Promise<{ email: string, staffRole: string }>}
 */
export async function acceptInvite(token, { name, password }, meta = {}) {
  const invite = await requireInvite(token);
  let user = await User.findOne({ email: invite.email }).select("+passwordHash");
  if (user) {
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw ApiError.unauthorized("That password doesn't match your SelfVibe account", {
        code: ERROR_CODES.INVALID_CREDENTIALS,
        fields: { password: "Wrong password" },
      });
    }
    if (user.staffRole) throw ApiError.conflict("This account is already on the team");
    user.staffRole = invite.staffRole;
    await user.save();
  } else {
    if (!name)
      throw ApiError.badRequest("Enter your name", { fields: { name: "Enter your name" } });
    user = await User.create({
      name,
      email: invite.email,
      passwordHash: await hashPassword(password),
      emailVerified: true, // they opened the link sent to this address
      roles: ["listener"],
      staffRole: invite.staffRole,
      onboardingDone: true,
    });
  }
  invite.status = "accepted";
  invite.acceptedAt = new Date();
  await invite.save();
  await recordAudit({
    staffId: user._id,
    staffRole: invite.staffRole,
    action: "team.invite_accept",
    targetType: "user",
    targetId: String(user._id),
    after: { email: invite.email, staffRole: invite.staffRole },
    method: "POST",
    path: "/api/admin/invites/accept",
    statusCode: 200,
    ip: meta.ip ?? null,
  });
  logger.info(`[Team] ${invite.email} joined as ${invite.staffRole}`);
  return { email: invite.email, staffRole: invite.staffRole };
}

/**
 * A staff member the Owner may change (not the Owner, not themself).
 * @param {string} userId
 * @param {string} ownerId
 * @returns {Promise<Object>} Mongoose document
 */
async function requireChangeableMember(userId, ownerId) {
  const user = await User.findOne({ _id: userId, staffRole: { $ne: null } });
  if (!user) throw ApiError.notFound("Staff member not found", { code: ERROR_CODES.NOT_FOUND });
  if (user.staffRole === "owner" || String(user._id) === String(ownerId)) {
    throw ApiError.forbidden("The Owner account can't be changed or removed", {
      code: ERROR_CODES.OWNER_PROTECTED,
    });
  }
  return user;
}

/**
 * Change a staff member's role.
 * @param {string} userId
 * @param {string} staffRole - admin | contentManager | moderator
 * @param {string} ownerId
 * @returns {Promise<{ before: Object, after: Object }>}
 */
export async function changeStaffRole(userId, staffRole, ownerId) {
  const user = await requireChangeableMember(userId, ownerId);
  const before = { staffRole: user.staffRole };
  user.staffRole = staffRole;
  await user.save();
  // New permissions apply at their next sign-in
  await revokeAllSessionsForUser(user._id, "role_changed");
  return { before, after: { staffRole } };
}

/**
 * Remove someone's console access (their listener account stays).
 * @param {string} userId
 * @param {string} ownerId
 * @returns {Promise<{ before: Object, after: Object }>}
 */
export async function removeStaff(userId, ownerId) {
  const user = await requireChangeableMember(userId, ownerId);
  const before = { staffRole: user.staffRole };
  user.staffRole = null;
  await user.save();
  await revokeAllSessionsForUser(user._id, "staff_removed");
  return { before, after: { staffRole: null } };
}

/**
 * Cancel a pending invite.
 * @param {string} inviteId
 * @returns {Promise<Object>}
 */
export async function revokeInvite(inviteId) {
  const invite = await StaffInvite.findOneAndUpdate(
    { _id: inviteId, status: "pending" },
    { $set: { status: "revoked" } },
    { returnDocument: "after" }
  ).lean();
  if (!invite) throw ApiError.notFound("Invite not found", { code: ERROR_CODES.NOT_FOUND });
  return toInviteView(invite);
}
