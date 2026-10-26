/**
 * Plans & payments API calls (PRD §10.10): /api/billing/*.
 */
import { api } from "@/services/api";

/**
 * Plans, prices and whether checkout is open (public).
 * @param {Object} [options]
 * @returns {Promise<{ available: boolean, currency: string, plans: Object[] }>}
 */
export function getPlans(options) {
  return api.get("/billing/plans", options);
}

/**
 * Start buying a plan; returns what Razorpay Checkout needs.
 * @param {{ plan: "premium"|"creatorPro", period: "monthly"|"yearly" }} choice
 * @returns {Promise<{ keyId: string, subscriptionId: string, planLabel: string, amountPaise: number, prefill: Object }>}
 */
export function startCheckout(choice) {
  return api.post("/billing/checkout", choice);
}

/**
 * Tell the server Checkout succeeded (it checks Razorpay's signature).
 * @param {{ paymentId: string, subscriptionId: string, signature: string }} result
 * @returns {Promise<Object>} Updated billing summary
 */
export function confirmCheckout(result) {
  return api.post("/billing/confirm", result);
}

/**
 * My plan, subscription and payment history.
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export function getMyBilling(options) {
  return api.get("/billing/me", options);
}

/**
 * Cancel at the end of the paid period.
 * @returns {Promise<Object>} Updated billing summary
 */
export function cancelSubscription() {
  return api.post("/billing/cancel");
}
