/**
 * Zod schemas for the staff console sign-in flow.
 */
import { z } from "zod";
import { currentPasswordField, emailField } from "./auth.validator.js";

const challengeTokenField = z
  .string({ error: "Sign-in step is missing. Please log in again." })
  .min(20, { error: "Sign-in step is invalid. Please log in again." })
  .max(2000);

export const staffLoginSchema = z.object({
  email: emailField,
  password: currentPasswordField,
});

export const twoFactorSetupSchema = z.object({
  challengeToken: challengeTokenField,
});

/** 6-digit authenticator code, or a backup code like "ABCD-EFGH". */
export const twoFactorVerifySchema = z.object({
  challengeToken: challengeTokenField,
  code: z
    .string({ error: "Enter the code from your authenticator app" })
    .trim()
    .regex(/^(\d{6}|[A-Za-z0-9]{4}-?[A-Za-z0-9]{4})$/, {
      error: "Enter the 6-digit code or a backup code",
    }),
});
