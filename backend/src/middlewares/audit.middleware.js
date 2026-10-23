/**
 * Audit every staff write (POST / PUT / PATCH / DELETE) in the admin console.
 * Use after requireStaff / requirePermission.
 * - Controllers describe the change with req.audit({ action, targetType, targetId, before, after }).
 * - Writes a controller did not describe still get a generic entry, so nothing is missed.
 * - req.skipAudit() for writes that change nothing (e.g. signing an upload URL).
 */
import { recordAudit } from "../services/audit.service.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * @type {import("express").RequestHandler}
 */
export function auditStaffWrites(req, res, next) {
  if (!WRITE_METHODS.has(req.method) || !req.staff) return next();

  const entries = [];
  let isSkipped = false;
  req.audit = (entry) => entries.push(entry);
  req.skipAudit = () => {
    isSkipped = true;
  };

  res.on("finish", () => {
    if (isSkipped) return;
    const base = {
      staffId: req.staff.userId,
      staffRole: req.staff.staffRole,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      ip: req.ip,
    };
    const toWrite = entries.length
      ? entries
      : [{ action: `${req.method.toLowerCase()} ${base.path}`, targetType: null, targetId: null }];
    // Failed attempts are recorded too (status code shows the outcome)
    toWrite.forEach((entry) => recordAudit({ ...base, ...entry }));
  });

  return next();
}
