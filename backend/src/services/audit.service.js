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
