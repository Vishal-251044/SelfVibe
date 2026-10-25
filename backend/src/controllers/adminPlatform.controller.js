/**
 * Owner Console platform endpoints (roadmap Day 9): /api/admin/stats, users,
 * verification requests, reports (moderation), comments, settings, team and
 * audit logs. Every write describes itself for the audit log (PRD ADL-7).
 */
import { getDashboardStats } from "../services/admin/adminDashboard.service.js";
import * as usersService from "../services/admin/adminUsers.service.js";
import { listReportGroups, moderate } from "../services/admin/moderation.service.js";
import * as commentsService from "../services/admin/adminComments.service.js";
import { getSettings, updateSettings } from "../services/settings.service.js";
import * as teamService from "../services/admin/team.service.js";
import * as staffSecurity from "../services/staffSecurity.service.js";
import { listAuditLogs } from "../services/audit.service.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** GET /api/admin/stats */
export const stats = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: "Dashboard fetched", data: await getDashboardStats() });
});

/* ===== Users & creators ===== */

/** GET /api/admin/users */
export const listUsers = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Users fetched",
    data: await usersService.listUsers(req.validated.query),
  });
});

/** GET /api/admin/users/:id */
export const getUser = asyncHandler(async (req, res) => {
  const data = await usersService.getUserDetail(req.validated.params.id);
  return sendSuccess(res, { message: "User fetched", data });
});

/** PATCH /api/admin/users/:id/status */
export const setUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const change = await usersService.setUserStatus(id, req.body.status);
  req.audit({
    action: req.body.status === "suspended" ? "user.suspend" : "user.reactivate",
    targetType: "user",
    targetId: id,
    ...change,
  });
  return sendSuccess(res, {
    message: req.body.status === "suspended" ? "Account suspended" : "Account reactivated",
    data: change.after,
  });
});

/** PATCH /api/admin/users/:id/creator */
export const setCreatorRole = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const change = await usersService.setCreatorRole(id, req.body.isCreator);
  req.audit({ action: "user.role_change", targetType: "user", targetId: id, ...change });
  return sendSuccess(res, { message: "Roles updated", data: change.after });
});

/** PATCH /api/admin/users/:id/verify */
export const setVerified = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const change = await usersService.setArtistVerified(id, req.body.verified, req.staff.userId);
  req.audit({
    action: req.body.verified ? "artist.verify" : "artist.unverify",
    targetType: "user",
    targetId: id,
    ...change,
  });
  return sendSuccess(res, {
    message: req.body.verified ? "Artist verified" : "Verification removed",
    data: change.after,
  });
});

/** POST /api/admin/users/:id/password-reset */
export const sendPasswordReset = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  await usersService.sendPasswordReset(id);
  req.audit({ action: "user.password_reset", targetType: "user", targetId: id });
  return sendSuccess(res, { message: "Password reset email sent", data: null });
});

/** GET /api/admin/verification-requests */
export const listVerificationRequests = asyncHandler(async (req, res) => {
  const items = await usersService.listVerificationRequests();
  return sendSuccess(res, { message: "Verification requests fetched", data: { items } });
});

/* ===== Moderation ===== */

/** GET /api/admin/reports */
export const listReports = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Reports fetched",
    data: await listReportGroups(req.validated.query),
  });
});

/** POST /api/admin/reports/action */
export const moderateReport = asyncHandler(async (req, res) => {
  const result = await moderate(req.body, req.staff.userId);
  req.audit({
    action: `moderation.${req.body.action}`,
    targetType: req.body.targetType,
    targetId: req.body.targetId,
    before: result.before,
    after: { ...result.after, reportsClosed: result.reportsClosed, note: req.body.note ?? null },
  });
  const messages = {
    dismiss: "Reports dismissed",
    takeDown: "Taken down",
    warn: "Warning sent",
    restore: "Restored",
  };
  return sendSuccess(res, { message: messages[req.body.action], data: result });
});

/* ===== Comments ===== */

/** GET /api/admin/comments */
export const listComments = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Comments fetched",
    data: await commentsService.listAdminComments(req.validated.query),
  });
});

/** PATCH /api/admin/comments/:id */
export const moderateComment = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const change = await commentsService.moderateComment(id, req.body.action);
  req.audit({
    action: `comment.${req.body.action}`,
    targetType: "comment",
    targetId: id,
    ...change,
  });
  return sendSuccess(res, { message: "Comment updated", data: change.after });
});

/** POST /api/admin/comments/:id/reply — reply as SelfVibe */
export const replyToComment = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const reply = await commentsService.replyAsSelfVibe(id, req.staff.userId, req.body.body);
  req.audit({
    action: "comment.reply",
    targetType: "comment",
    targetId: id,
    after: { replyId: reply.id, body: reply.body },
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: "Reply posted as SelfVibe",
    data: { comment: reply },
  });
});

/* ===== Settings (Owner) ===== */

/** GET /api/admin/settings */
export const getAllSettings = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Settings fetched",
    data: { settings: await getSettings(), yourIp: req.ip },
  });
});

/** PATCH /api/admin/settings */
export const saveSettings = asyncHandler(async (req, res) => {
  const { before, after } = await updateSettings(req.body, {
    staffId: req.staff.userId,
    ip: req.ip,
  });
  const keys = Object.keys(req.body);
  req.audit({
    action: "settings.update",
    targetType: "settings",
    targetId: keys.join(","),
    before: Object.fromEntries(keys.map((key) => [key, before[key]])),
    after: Object.fromEntries(keys.map((key) => [key, after[key]])),
  });
  return sendSuccess(res, { message: "Settings saved", data: { settings: after } });
});

/* ===== Team (Owner) ===== */

/** GET /api/admin/team */
export const listTeam = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: "Team fetched", data: await teamService.listTeam() });
});

/** POST /api/admin/team/invites */
export const inviteStaff = asyncHandler(async (req, res) => {
  const inviter = await User.findById(req.staff.userId).select("name").lean();
  const result = await teamService.inviteStaff(req.body, {
    staffId: req.staff.userId,
    name: inviter?.name ?? "The Owner",
  });
  req.audit({
    action: "team.invite",
    targetType: "invite",
    targetId: result.invite.id,
    after: { email: req.body.email, staffRole: req.body.staffRole },
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: result.emailSent
      ? `Invite sent to ${req.body.email}`
      : "Invite created — share the link",
    data: result,
  });
});

/** DELETE /api/admin/team/invites/:id */
export const revokeInvite = asyncHandler(async (req, res) => {
  const invite = await teamService.revokeInvite(req.validated.params.id);
  req.audit({
    action: "team.invite_revoke",
    targetType: "invite",
    targetId: invite.id,
    before: { email: invite.email },
  });
  return sendSuccess(res, { message: "Invite cancelled", data: { invite } });
});

/** PATCH /api/admin/team/:id */
export const changeStaffRole = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const change = await teamService.changeStaffRole(id, req.body.staffRole, req.staff.userId);
  req.audit({ action: "team.role_change", targetType: "user", targetId: id, ...change });
  return sendSuccess(res, { message: "Role updated", data: change.after });
});

/** DELETE /api/admin/team/:id */
export const removeStaff = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const change = await teamService.removeStaff(id, req.staff.userId);
  req.audit({ action: "team.remove", targetType: "user", targetId: id, ...change });
  return sendSuccess(res, { message: "Console access removed", data: change.after });
});

/**
 * Owner security actions on a team member (roadmap Day 10): unlock, reset 2FA,
 * sign out everywhere. Each one is audit-logged.
 * @param {"unlock"|"reset2fa"|"signOut"} kind
 * @returns {import("express").RequestHandler}
 */
export const teamSecurityAction = (kind) => {
  const actions = {
    unlock: [staffSecurity.unlockStaff, "team.unlock", "Account unlocked"],
    reset2fa: [
      staffSecurity.resetStaffTwoFactor,
      "team.reset_2fa",
      "2FA reset — they set it up again at their next sign-in",
    ],
    signOut: [staffSecurity.endStaffSessions, "team.sign_out", "Signed out of every device"],
  };
  const [run, action, message] = actions[kind];
  return asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const change = await run(id);
    req.audit({ action, targetType: "user", targetId: id, ...change });
    return sendSuccess(res, { message, data: change.after });
  });
};

/** GET /api/admin/invites/:token — public (invite page) */
export const getInvite = asyncHandler(async (req, res) => {
  const invite = await teamService.getInvite(req.validated.params.token);
  return sendSuccess(res, { message: "Invite fetched", data: { invite } });
});

/** POST /api/admin/invites/:token/accept — public */
export const acceptInvite = asyncHandler(async (req, res) => {
  const result = await teamService.acceptInvite(req.validated.params.token, req.body, {
    ip: req.ip,
  });
  return sendSuccess(res, {
    message: "Welcome to the team — sign in to the console to set up 2FA",
    data: result,
  });
});

/* ===== Audit log ===== */

/** GET /api/admin/audit-logs */
export const auditLogs = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Audit log fetched",
    data: await listAuditLogs(req.validated.query),
  });
});
