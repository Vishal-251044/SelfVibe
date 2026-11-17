/**
 * Razorpay REST API (PRD §10.10 payment gateway): plans, subscriptions,
 * payments, and the two signature checks. Called with Node's fetch and basic
 * auth (key id + secret), so no SDK is needed. Errors become ApiErrors with
 * Razorpay's own description, and secrets never appear in logs.
 * Docs: https://razorpay.com/docs/api/payments/subscriptions/
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import { ERROR_CODES } from "../../config/constants.js";
import { ApiError } from "../../utils/ApiError.js";
import { logger } from "../../utils/logger.js";

const REQUEST_TIMEOUT_MS = 15_000;
const KEYS_REJECTED_HINT =
  "Razorpay rejected RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (they don't match). " +
  "Generate a new key pair in Razorpay Dashboard → Account & Settings → API Keys, " +
  "put both values in backend/.env and restart the API.";
const SUBSCRIPTIONS_OFF_HINT =
  "The keys work, but Razorpay Subscriptions is not enabled on this account " +
  "(plans and subscriptions return 401). Open Razorpay Dashboard → Subscriptions and " +
  "enable it, in the same mode (Test / Live) as the keys.";

/**
 * Basic-auth GET to Razorpay, used by the startup check.
 * @param {string} path
 * @returns {Promise<number>} HTTP status
 */
async function probe(path) {
  const { keyId, keySecret, apiBase } = env.razorpay;
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return response.status;
}

/**
 * Check at startup (read-only calls) that Razorpay accepts the keys AND that
 * Subscriptions is enabled, so either problem shows up in the API log instead
 * of at someone's checkout. Never throws.
 * @returns {Promise<"ok"|"keys_rejected"|"subscriptions_off"|null>} null = not configured / unreachable
 */
export async function verifyRazorpayKeys() {
  const { isConfigured, isLiveMode } = env.razorpay;
  if (!isConfigured) return null;
  try {
    // Payments work on every account, so a 401 here means the key pair itself is wrong
    if ((await probe("/payments?count=1")) === 401) {
      logger.error(`[Razorpay] ${KEYS_REJECTED_HINT}`);
      return "keys_rejected";
    }
    if ((await probe("/plans?count=1")) === 401) {
      logger.error(`[Razorpay] ${SUBSCRIPTIONS_OFF_HINT}`);
      return "subscriptions_off";
    }
    logger.info(`[Razorpay] keys and subscriptions OK (${isLiveMode ? "LIVE" : "test"} mode)`);
    return "ok";
  } catch (error) {
    logger.warn(`[Razorpay] could not check the keys at startup: ${error.message}`);
    return null;
  }
}

/** @returns {ApiError} 503 while Razorpay keys aren't set */
export function paymentsNotConfigured() {
  return new ApiError(503, "Payments aren't available yet. Please try again later.", {
    code: ERROR_CODES.NOT_CONFIGURED,
  });
}

/**
 * Call the Razorpay API.
 * @param {"GET"|"POST"} method
 * @param {string} path - e.g. "/subscriptions"
 * @param {Object} [body]
 * @returns {Promise<Object>} Parsed JSON
 * @throws {ApiError} 503 when not configured, 502 when Razorpay fails
 */
async function request(method, path, body) {
  const { keyId, keySecret, apiBase, isConfigured } = env.razorpay;
  if (!isConfigured) throw paymentsNotConfigured();

  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logger.error(`[Razorpay] ${method} ${path} unreachable: ${error.message}`);
    throw new ApiError(502, "The payment service isn't responding. Please try again.", {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
    });
  }

  const data = await response.json().catch(() => ({}));
  // 401 = a setup problem (wrong key pair, or Subscriptions not enabled — Razorpay answers
  // "Authentication failed" for the first and a bare "Unauthorized" for the second), not
  // something the user can fix
  if (response.status === 401) {
    const hint =
      data?.error?.description === "Authentication failed"
        ? KEYS_REJECTED_HINT
        : SUBSCRIPTIONS_OFF_HINT;
    logger.error(`[Razorpay] ${method} ${path} rejected: ${hint}`);
    throw new ApiError(503, "Payments are temporarily unavailable. Please try again later.", {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
    });
  }
  if (!response.ok) {
    const description = data?.error?.description ?? `HTTP ${response.status}`;
    logger.error(`[Razorpay] ${method} ${path} failed: ${description}`);
    throw new ApiError(502, `Payment service error: ${description}`, {
      code: ERROR_CODES.SERVICE_UNAVAILABLE,
    });
  }
  return data;
}

/**
 * Create a Razorpay plan (plans can't be edited, so a new price = a new plan).
 * @param {{ planKey: string, label: string, period: "monthly"|"yearly", amountPaise: number }} input
 * @returns {Promise<string>} plan id (plan_…)
 */
export async function createPlan({ planKey, label, period, amountPaise }) {
  const plan = await request("POST", "/plans", {
    period,
    interval: 1,
    item: {
      name: `SelfVibe ${label} (${period})`,
      amount: amountPaise,
      currency: "INR",
      description: `SelfVibe ${label}, billed ${period}`,
    },
    notes: { planKey, period },
  });
  return plan.id;
}

/**
 * Start a subscription; the person authorises it in Razorpay Checkout.
 * @param {{ planId: string, totalCount: number, notes: Object }} input
 * @returns {Promise<Object>} Razorpay subscription entity
 */
export function createSubscription({ planId, totalCount, notes }) {
  return request("POST", "/subscriptions", {
    plan_id: planId,
    total_count: totalCount,
    quantity: 1,
    customer_notify: 1, // Razorpay emails receipts and renewal reminders
    notes,
  });
}

/**
 * @param {string} subscriptionId - sub_…
 * @returns {Promise<Object>} Razorpay subscription entity
 */
export function fetchSubscription(subscriptionId) {
  return request("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

/**
 * Cancel a subscription.
 * @param {string} subscriptionId
 * @param {boolean} atCycleEnd - true: keep it until the paid period ends
 * @returns {Promise<Object>} Razorpay subscription entity
 */
export function cancelSubscription(subscriptionId, atCycleEnd) {
  return request("POST", `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    cancel_at_cycle_end: atCycleEnd ? 1 : 0,
  });
}

/**
 * @param {string} paymentId - pay_…
 * @returns {Promise<Object>} Razorpay payment entity
 */
export function fetchPayment(paymentId) {
  return request("GET", `/payments/${encodeURIComponent(paymentId)}`);
}

/**
 * Compare two hex signatures in constant time.
 * @param {string} expected
 * @param {unknown} received
 * @returns {boolean}
 */
function signaturesMatch(expected, received) {
  if (typeof received !== "string" || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

/**
 * Checkout result check: Razorpay signs "<payment id>|<subscription id>" with
 * the key secret, so only a real payment for this subscription passes.
 * @param {{ paymentId: string, subscriptionId: string, signature: string }} input
 * @param {string} [secret] - Defaults to RAZORPAY_KEY_SECRET
 * @returns {boolean}
 */
export function verifyCheckoutSignature(
  { paymentId, subscriptionId, signature },
  secret = env.razorpay.keySecret
) {
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return signaturesMatch(expected, signature);
}

/**
 * Webhook check: the raw request body signed with the webhook secret.
 * @param {Buffer|string} rawBody - Exactly as received (not re-serialised JSON)
 * @param {unknown} signature - X-Razorpay-Signature header
 * @param {string} [secret] - Defaults to RAZORPAY_WEBHOOK_SECRET
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signature, secret = env.razorpay.webhookSecret) {
  if (!secret || !rawBody) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return signaturesMatch(expected, signature);
}
