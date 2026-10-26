/**
 * Plans & payments endpoints (PRD §12 Billing): /api/billing/* for listeners,
 * the Razorpay webhook, and /api/admin/billing/* for the console.
 */
import * as billing from "../services/billing/billing.service.js";
import * as adminBilling from "../services/admin/adminBilling.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

/** GET /api/billing/plans — plans and prices (public) */
export const plans = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: "Plans fetched", data: await billing.getPlansForSale() });
});

/** POST /api/billing/checkout — start buying a plan */
export const checkout = asyncHandler(async (req, res) => {
  const data = await billing.startCheckout({ userId: req.auth.userId }, req.body);
  return sendSuccess(res, { statusCode: 201, message: "Checkout ready", data });
});

/** POST /api/billing/confirm — after Razorpay Checkout succeeds */
export const confirm = asyncHandler(async (req, res) => {
  const data = await billing.confirmCheckout({ userId: req.auth.userId }, req.body);
  return sendSuccess(res, { message: "Payment confirmed", data });
});

/** GET /api/billing/me — my plan, subscription and payments */
export const me = asyncHandler(async (req, res) => {
  const data = await billing.getMyBilling({ userId: req.auth.userId });
  return sendSuccess(res, { message: "Billing fetched", data });
});

/** POST /api/billing/cancel — cancel at the end of the paid period */
export const cancel = asyncHandler(async (req, res) => {
  const data = await billing.cancelMySubscription({ userId: req.auth.userId });
  return sendSuccess(res, { message: "Subscription cancelled", data });
});

/**
 * POST /api/billing/webhook — Razorpay events (raw body, signature checked).
 * Always answers 200 once verified, so Razorpay doesn't retry handled events.
 */
export const webhook = asyncHandler(async (req, res) => {
  const result = await billing.handleWebhook(req.body, {
    signature: req.get("x-razorpay-signature"),
    eventId: req.get("x-razorpay-event-id"),
  });
  return sendSuccess(res, { message: "Webhook received", data: result });
});

/* ===== Console ===== */

/** GET /api/admin/billing/subscriptions */
export const adminList = asyncHandler(async (req, res) => {
  const data = await adminBilling.listSubscriptions(req.validated.query);
  return sendSuccess(res, { message: "Subscriptions fetched", data });
});

/** GET /api/admin/billing/stats */
export const adminStats = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Billing stats fetched",
    data: await adminBilling.getBillingStats(),
  });
});

/** POST /api/admin/billing/grant — give a plan without payment (Owner) */
export const adminGrant = asyncHandler(async (req, res) => {
  const change = await adminBilling.grantPlan(req.body, req.staff.userId);
  req.audit({ action: "billing.grant", targetType: "user", targetId: req.body.userId, ...change });
  return sendSuccess(res, { statusCode: 201, message: "Plan granted", data: change.after });
});

/** POST /api/admin/billing/subscriptions/:id/revoke — end a granted plan (Owner) */
export const adminRevoke = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const change = await adminBilling.revokeGrant(id);
  req.audit({ action: "billing.revoke", targetType: "subscription", targetId: id, ...change });
  return sendSuccess(res, { message: "Granted plan ended", data: change.after });
});
