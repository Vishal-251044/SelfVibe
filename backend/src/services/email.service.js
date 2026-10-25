/**
 * Transactional email (password reset, notices) via the Resend HTTP API.
 * - RESEND_API_KEY set: the email is sent.
 * - Not set, in development: the email is saved to backend/.dev-emails/ so the
 *   flow can be tested locally (links are never written to the logs).
 * - Not set, in production: sending fails with 503 NOT_CONFIGURED.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../config/constants.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10000;
const DEV_MAILBOX_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.dev-emails"
);

/**
 * Whether emails can be delivered (or captured locally in development).
 * @returns {boolean}
 */
export function canSendEmail() {
  return env.email.isConfigured || !env.isProduction;
}

/**
 * Save an email to the local dev mailbox instead of sending it.
 * @param {{ to: string, subject: string, html: string }} message
 * @returns {Promise<void>}
 */
async function saveToDevMailbox({ to, subject, html }) {
  await mkdir(DEV_MAILBOX_DIR, { recursive: true });
  // Random part: two emails in the same millisecond (e.g. a lock alert to two people) must not collide
  const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(2).toString("hex")}-${subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)}.html`;
  await writeFile(path.join(DEV_MAILBOX_DIR, fileName), `<!-- to: ${to} -->\n${html}`);
  logger.info(
    `[EmailService] RESEND_API_KEY not set — email "${subject}" saved to backend/.dev-emails/${fileName}`
  );
}

/**
 * Send an email.
 * @param {{ to: string, subject: string, html: string, text: string }} message
 * @returns {Promise<void>}
 * @throws {ApiError} 503 when email is not configured in production, 502 when Resend fails
 */
export async function sendEmail(message) {
  if (!env.email.isConfigured) {
    if (!env.isProduction) return saveToDevMailbox(message);
    throw new ApiError(503, "Email is not available right now. Please try again later.", {
      code: ERROR_CODES.NOT_CONFIGURED,
    });
  }

  let response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.email.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.email.from, ...message }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logger.error(
      { err: error },
      `[EmailService] could not reach Resend subject="${message.subject}"`
    );
    throw new ApiError(502, "We couldn't send the email. Please try again in a moment.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error(
      `[EmailService] Resend rejected the email status=${response.status} subject="${message.subject}" detail=${detail.slice(0, 300)}`
    );
    throw new ApiError(502, "We couldn't send the email. Please try again in a moment.");
  }

  logger.debug(`[EmailService] sent "${message.subject}"`);
}
