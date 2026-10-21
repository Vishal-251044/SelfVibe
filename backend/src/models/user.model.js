/**
 * User: every account — listeners, creators and staff (PRD §13 `users`).
 * Secrets (password hash, 2FA secret) are excluded from queries by default
 * and stripped from JSON output.
 */
import mongoose from "mongoose";
import { PLANS, STAFF_ROLES, USER_ROLES, USER_STATUS } from "../config/constants.js";

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
    googleId: { type: String, unique: true, sparse: true, select: false },
    avatar: { type: String, default: null },
    bio: { type: String, trim: true, maxlength: 300, default: "" },

    roles: {
      type: [{ type: String, enum: USER_ROLES }],
      default: ["listener"],
    },
    staffRole: { type: String, enum: [...STAFF_ROLES, null], default: null },
    twoFactorSecret: { type: String, select: false },
    twoFactorEnabled: { type: Boolean, default: false },

    status: { type: String, enum: USER_STATUS, default: "active" },
    plan: { type: String, enum: PLANS, default: "free" },
    aiCredits: { type: Number, default: 0, min: 0 },
    onboardingDone: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      // Never send secrets to clients, even if they were explicitly selected
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.twoFactorSecret;
        delete ret.googleId;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ staffRole: 1 }, { sparse: true });

export const User = mongoose.model("User", userSchema);
