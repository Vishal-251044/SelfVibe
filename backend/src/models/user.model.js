/**
 * User: every account — listeners, creators and staff (PRD §13 `users`).
 * Secrets (password hash, 2FA secret) are excluded from queries by default
 * and stripped from JSON output.
 */
import mongoose from "mongoose";
import {
  PLANS,
  STAFF_ROLES,
  USER_ROLES,
  USER_STATUS,
  CATALOG_FILTERS,
} from "../config/constants.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, select: false }, // absent for Google-only accounts
    passwordChangedAt: { type: Date, default: null },
    googleId: { type: String, unique: true, sparse: true, select: false },
    // True once the user proved they own the email (Google sign-in or a reset link)
    emailVerified: { type: Boolean, default: false },

    // Forgot-password (PRD AUTH-4): only the SHA-256 hash of the emailed token is stored
    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpiresAt: { type: Date, select: false, default: null },
    avatar: { type: String, default: null },
    bio: { type: String, trim: true, maxlength: 300, default: "" },

    roles: {
      type: [{ type: String, enum: USER_ROLES }],
      default: ["listener"],
    },
    staffRole: { type: String, enum: [...STAFF_ROLES, null], default: null },

    // Two-factor auth (staff only, PRD ADL-2). Secrets are AES-256-GCM encrypted.
    twoFactorSecret: { type: String, select: false },
    twoFactorPendingSecret: { type: String, select: false }, // during setup, before first code
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorLastTimeStep: { type: Number, select: false, default: null }, // blocks code replay
    twoFactorBackupCodes: {
      type: [{ _id: false, hash: String, usedAt: { type: Date, default: null } }],
      select: false,
      default: undefined,
    },

    // Staff lockout (PRD ADL-5): wrong passwords / 2FA codes in a row, and the lock end
    failedLoginCount: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: null },
    // Browsers a staff member signed in from (hashed device cookie) for new-device alerts
    staffDevices: {
      type: [
        {
          _id: false,
          hash: String,
          label: String,
          ip: String,
          firstSeenAt: Date,
          lastSeenAt: Date,
        },
      ],
      select: false,
      default: undefined,
    },

    status: { type: String, enum: USER_STATUS, default: "active" },
    plan: { type: String, enum: PLANS, default: "free" },
    aiCredits: { type: Number, default: 0, min: 0 },
    onboardingDone: { type: Boolean, default: false },
    // All · Official · Community switch, remembered per user (PRD CAT-2)
    catalogFilter: { type: String, enum: CATALOG_FILTERS, default: "all" },
    // Last searches, newest first (PRD SRC-3)
    recentSearches: {
      type: [{ _id: false, query: { type: String, maxlength: 100 }, at: { type: Date } }],
      default: [],
    },
    lastLoginAt: { type: Date, default: null },
    // Moderation warnings sent to this user (roadmap Day 9)
    warnings: {
      type: [
        {
          _id: false,
          reason: { type: String, maxlength: 200 },
          at: { type: Date, default: Date.now },
          by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Never send secrets to clients, even if they were explicitly selected
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.twoFactorSecret;
        delete ret.twoFactorPendingSecret;
        delete ret.twoFactorLastTimeStep;
        delete ret.twoFactorBackupCodes;
        delete ret.googleId;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.failedLoginCount;
        delete ret.staffDevices;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Fast lookup of a reset link's token (only users with a pending reset are indexed)
userSchema.index(
  { passwordResetTokenHash: 1 },
  { partialFilterExpression: { passwordResetTokenHash: { $type: "string" } } }
);

// Database-level guarantee that only one Owner can ever exist (PRD §8.2)
userSchema.index(
  { staffRole: 1 },
  { name: "single_owner", unique: true, partialFilterExpression: { staffRole: "owner" } }
);

export const User = mongoose.model("User", userSchema);
