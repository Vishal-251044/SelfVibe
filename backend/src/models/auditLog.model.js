/**
 * AuditLog: every staff write in the admin console (PRD ADL-7) —
 * who, what, target, before / after, IP and time. Never edited or deleted.
 */
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    staffRole: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "track.create", "artist.update"
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    method: { type: String, default: null },
    path: { type: String, default: null },
    statusCode: { type: Number, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ staffId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
