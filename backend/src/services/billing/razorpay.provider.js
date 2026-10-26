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
