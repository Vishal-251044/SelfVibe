/**
 * StaffInvite: the Owner invites someone to the console by email (roadmap
 * Day 9 Team). Only a SHA-256 hash of the invite token is stored. Pending
 * invites expire after 7 days (TTL index removes them).
 */
import mongoose from "mongoose";
import { INVITABLE_STAFF_ROLES } from "../config/constants.js";

const staffInviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    staffRole: { type: String, enum: INVITABLE_STAFF_ROLES, required: true },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "revoked"], default: "pending" },
    acceptedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

staffInviteSchema.index({ email: 1, status: 1 });
staffInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const StaffInvite = mongoose.model("StaffInvite", staffInviteSchema);
