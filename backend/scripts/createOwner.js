/**
 * Create the single Owner account for the admin console (PRD ADL-3).
 * Run with: npm run create-owner
 * Reads OWNER_EMAIL, OWNER_PASSWORD and OWNER_NAME from backend/.env.
 *
 * Safety rules:
 * - Refuses to run if an Owner already exists (there is exactly one Owner).
 * - Refuses to promote an existing public account with the same email, so
 *   nobody can pre-register the Owner's email and inherit console access.
 * - The Owner signs in with the normal login (email or Google); the console
 *   opens from the account menu (one login for staff).
 */
import mongoose from "mongoose";
import { z } from "zod";
import { env, isUnset } from "../src/config/env.js";
import { OWNER_PASSWORD_MIN_LENGTH } from "../src/config/constants.js";
import { User } from "../src/models/user.model.js";
import { emailField, newPasswordField } from "../src/validators/auth.validator.js";
import { hashPassword } from "../src/utils/password.js";
import { logger } from "../src/utils/logger.js";

const ownerInputSchema = z.object({
  email: emailField,
  password: newPasswordField(OWNER_PASSWORD_MIN_LENGTH).refine(
    (value) => /[a-z]/i.test(value) && /\d/.test(value),
    { error: "OWNER_PASSWORD must contain letters and numbers" }
  ),
  name: z.string().trim().min(1).max(80),
});

/**
 * Validate the owner settings from the environment.
 * @returns {{ email: string, password: string, name: string }}
 * @throws {Error} With every problem listed
 */
function readOwnerInput() {
  const { email, password, name } = env.owner;
  if (isUnset(env.databaseUrl)) throw new Error("DATABASE_URL is not set in backend/.env");
  if (isUnset(email) || isUnset(password)) {
    throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD in backend/.env first");
  }

  const result = ownerInputSchema.safeParse({ email, password, name });
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path[0]}: ${issue.message}`);
    throw new Error(`Invalid owner settings:\n  - ${problems.join("\n  - ")}`);
  }
  return result.data;
}

/**
 * Create the Owner, enforcing the safety rules above.
 * @returns {Promise<void>}
 */
async function createOwner() {
  const input = readOwnerInput();
  await mongoose.connect(env.databaseUrl, { serverSelectionTimeoutMS: 15000 });

  const existingOwner = await User.findOne({ staffRole: "owner" }).select("email");
  if (existingOwner) {
    throw new Error(`An Owner already exists (${existingOwner.email}). Nothing was changed.`);
  }

  const emailInUse = await User.exists({ email: input.email });
  if (emailInUse) {
    throw new Error(
      `A user with ${input.email} already exists. For safety, existing accounts are never promoted to Owner — use a different OWNER_EMAIL.`
    );
  }

  const owner = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    roles: ["listener"],
    staffRole: "owner",
    twoFactorEnabled: false, // staff use one login (no authenticator), see staffAuth.service
    // Set by the server operator from backend/.env, so the address counts as verified
    // (otherwise "Continue with Google" would treat it as unproven and drop the password)
    emailVerified: true,
    onboardingDone: true,
  });

  logger.info(
    `[CreateOwner] Owner created email=${owner.email} id=${owner._id}. Log in at /login; the Admin panel is in the account menu.`
  );
}

createOwner()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error(`[CreateOwner] ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
