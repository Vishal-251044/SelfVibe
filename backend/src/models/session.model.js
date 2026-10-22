/**
 * Session: one signed-in device for a user or a staff member.
 * Holds the SHA-256 hash of the current refresh token (never the token itself).
 * Refresh tokens rotate on every use; recently replaced hashes are kept so a
 * stolen-and-reused token can be detected and the whole session revoked.
 * Expired sessions are deleted automatically by the TTL index.
 */
import mongoose from "mongoose";
import { SESSION_KINDS } from "../config/constants.js";

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: Object.values(SESSION_KINDS), required: true },
    tokenHash: { type: String, required: true, unique: true },
    // Last few replaced token hashes: grace window + reuse (theft) detection
    recentTokens: {
      type: [{ _id: false, hash: String, supersededAt: Date }],
      default: [],
    },
    expiresAt: { type: Date, required: true },
    lastActivityAt: { type: Date, default: Date.now }, // staff idle timeout (ADL-4)
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },
    userAgent: { type: String, maxlength: 400, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ "recentTokens.hash": 1 });
sessionSchema.index({ userId: 1, kind: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model("Session", sessionSchema);
