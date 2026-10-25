/**
 * Staff audit log (PRD ADL-7): who did what, to what, before / after, when.
 */
import { AuditLog } from "../models/auditLog.model.js";
import { logger } from "../utils/logger.js";

// Never store secrets or bulky fields in before / after snapshots
const OMITTED_FIELDS = new Set([
  "passwordHash",
  "twoFactorSecret",
  "twoFactorPendingSecret",
  "twoFactorBackupCodes",
  "passwordResetTokenHash",
  "waveform",
  "lyrics",
  "__v",
]);

/**
 * Plain, size-limited copy of a document for the audit log.
 * @param {Object|null} value
 * @returns {Object|null}
 */
export function toAuditSnapshot(value) {
  if (!value) return null;
  const plain = typeof value.toObject === "function" ? value.toObject() : value;
  const snapshot = JSON.parse(
    JSON.stringify(plain, (key, field) => (OMITTED_FIELDS.has(key) ? undefined : field))
  );
  if (snapshot?.audio) delete snapshot.audio.waveform;
  return snapshot;
}

/**
 * Write one audit entry. Never throws — an audit failure must not break the action,
 * but it is logged loudly.
 * @param {Object} entry - staffId, staffRole, action, targetType, targetId, before, after, method, path, statusCode, ip
 * @returns {Promise<void>}
 */
export async function recordAudit(entry) {
  try {
    await AuditLog.create({
      ...entry,
      targetId: entry.targetId ? String(entry.targetId) : null,
      before: toAuditSnapshot(entry.before),
      after: toAuditSnapshot(entry.after),
    });
  } catch (error) {
    logger.error({ err: error }, `[AuditService] failed to record ${entry.action}`);
  }
}

/**
 * Search the audit log (roadmap Day 9 Audit log viewer): filter by person,
 * action (prefix, e.g. "track." for every song action), target and dates.
 * @param {{ staffId?: string, action?: string, targetType?: string, targetId?: string, from?: Date, to?: Date, page: number, limit: number }} query
 * @returns {Promise<{ items: Object[], meta: Object, actions: string[] }>}
 */
export async function listAuditLogs({
  staffId,
  action,
  targetType,
  targetId,
  from,
  to,
  page = 1,
  limit = 50,
}) {
  const where = {};
  if (staffId) where.staffId = staffId;
  if (action) where.action = new RegExp(`^${action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;
  if (from || to) where.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const [rows, total, actions] = await Promise.all([
    AuditLog.find(where)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("staffId", "name email")
      .lean(),
    AuditLog.countDocuments(where),
    AuditLog.distinct("action", { action: { $not: /^(get|post|put|patch|delete) \// } }),
  ]);
  return {
    items: rows.map((row) => ({
      id: String(row._id),
      staff: row.staffId?._id
        ? { id: String(row.staffId._id), name: row.staffId.name, email: row.staffId.email }
        : null,
      staffRole: row.staffRole,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      before: row.before,
      after: row.after,
      method: row.method,
      path: row.path,
      statusCode: row.statusCode,
      ip: row.ip,
      createdAt: row.createdAt,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
    },
    actions: actions.sort(),
  };
}
