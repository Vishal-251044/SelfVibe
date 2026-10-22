/**
 * Zod schemas for listener / creator authentication requests.
 */
import { z } from "zod";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "../config/constants.js";

/** Trimmed, lower-cased email. */
export const emailField = z
  .string({ error: "Enter your email" })
  .trim()
  .toLowerCase()
  .min(1, { error: "Enter your email" })
  .max(254, { error: "Email is too long" })
  .pipe(z.email({ error: "Enter a valid email address" }));

/**
 * New password rules (AUTH-1: at least 8 characters). bcrypt ignores bytes past
 * 72, so longer passwords are rejected instead of being silently truncated.
 * @param {number} [minLength]
 * @returns {import("zod").ZodString}
 */
export function newPasswordField(minLength = PASSWORD_MIN_LENGTH) {
  return z
    .string({ error: "Enter a password" })
    .min(minLength, { error: `Use at least ${minLength} characters` })
    .refine((value) => Buffer.byteLength(value, "utf8") <= PASSWORD_MAX_BYTES, {
      error: `Use at most ${PASSWORD_MAX_BYTES} characters`,
    });
}

/** Existing password: only presence and a sane upper bound are checked. */
export const currentPasswordField = z
  .string({ error: "Enter your password" })
  .min(1, { error: "Enter your password" })
  .max(256, { error: "Password is too long" });

export const registerSchema = z.object({
  name: z
    .string({ error: "Enter your name" })
    .trim()
    .min(1, { error: "Enter your name" })
    .max(80, { error: "Name must be 80 characters or fewer" }),
  email: emailField,
  password: newPasswordField(),
});

export const loginSchema = z.object({
  email: emailField,
  password: currentPasswordField,
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

const resetTokenField = z
  .string({ error: "This reset link is incomplete" })
  .trim()
  .regex(/^[A-Za-z0-9_-]{20,200}$/, { error: "This reset link is invalid" });

export const resetPasswordSchema = z.object({
  token: resetTokenField,
  password: newPasswordField(),
});

export const resetTokenQuerySchema = z.object({
  token: resetTokenField,
});
