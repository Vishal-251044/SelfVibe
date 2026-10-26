/**
 * Plans & payments (PRD §10.10, F33): Free / Premium / Creator Pro, monthly
 * or yearly, paid with Razorpay subscriptions (UPI AutoPay, cards, netbanking).
 *
 * Flow:
 *  1. startCheckout() creates a Razorpay subscription; the app opens Checkout
 *  2. the person pays; confirmCheckout() checks Razorpay's signature and syncs
 *  3. renewals, failures and cancellations arrive as webhooks (handleWebhook),
 *     verified with the webhook secret and applied exactly once
 *  4. users.plan always follows the subscriptions (refreshUserPlan), so every
 *     feature gate keeps reading one field
 * Prices are Owner settings; a Razorpay plan is created once per price.
 */
import { Subscription } from "../../models/subscription.model.js";
import { Payment } from "../../models/payment.model.js";
import { BillingEvent } from "../../models/billingEvent.model.js";
import { Setting } from "../../models/setting.model.js";
import { User } from "../../models/user.model.js";
import * as razorpay from "./razorpay.provider.js";
import { effectivePlan, fromRazorpaySubscription, hasAccess } from "./subscriptionAccess.js";
import { getSettings } from "../settings.service.js";
import { canSendEmail, sendEmail } from "../email.service.js";
import { paymentFailedEmail, subscriptionStartedEmail } from "../../utils/emailTemplates.js";
import { env } from "../../config/env.js";
import {
  ERROR_CODES,
  PAID_PLAN_KEYS,
  PLAN_LABELS,
  SUBSCRIPTION_TOTAL_COUNT,
} from "../../config/constants.js";
import { ApiError } from "../../utils/ApiError.js";
import { logger } from "../../utils/logger.js";

const PLAN_IDS_SETTING = "razorpayPlanIds"; // price → Razorpay plan id (not an Owner setting)
const REUSE_UNPAID_CHECKOUT_MS = 30 * 60 * 1000;
const PAYMENTS_SHOWN = 12;

// What each paid plan unlocks today (shown on the pricing page; AI credits arrive on Day 11+)
const PLAN_PERKS = {
  premium: [
    "High-quality streams when available",
    "Supports independent artists",
    "Bigger AI credit allowance (coming with AI Studio)",
  ],
  creatorPro: [
    "Everything in Premium",
    "Unlimited song uploads",
    "Most AI credits (coming with AI Studio)",
  ],
};

/** @returns {string} Where people manage their plan */
function manageUrl() {
  return `${env.appUrl}/profile`;
}

/**
 * Format a date for emails, e.g. "26 Nov 2026".
 * @param {Date|null} date
 * @returns {string|null}
 */
function shortDate(date) {
  return date
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(date)
      )
    : null;
}

/**
 * Send a billing email without ever failing the request.
 * @param {string} to
 * @param {{ subject: string, html: string, text: string }} message
 */
function notify(to, message) {
  if (!canSendEmail() || !to) return;
  sendEmail({ to, ...message }).catch((error) =>
    logger.error(`[Billing] email "${message.subject}" failed: ${error.message}`)
  );
}

/* ===== Plans for sale ===== */

/**
 * Can people buy right now? (keys set and the Owner hasn't switched payments off)
 * @returns {Promise<boolean>}
 */
async function isCheckoutOpen() {
  const { features } = await getSettings();
  return env.razorpay.isConfigured && features.payments !== false;
}

/**
 * Plans and prices for the pricing page (public).
 * @returns {Promise<{ available: boolean, currency: string, plans: Object[] }>}
 */
export async function getPlansForSale() {
  const { planPrices } = await getSettings();
  return {
    available: await isCheckoutOpen(),
    currency: "INR",
    plans: PAID_PLAN_KEYS.map((plan) => ({
      plan,
      label: PLAN_LABELS[plan],
      prices: { monthly: planPrices[plan].monthly, yearly: planPrices[plan].yearly },
      perks: PLAN_PERKS[plan],
    })),
  };
}

/**
 * The Razorpay plan for a price, created the first time that price is sold.
 * Live and test keys keep separate ids.
 * @param {string} plan
 * @param {"monthly"|"yearly"} period
 * @param {number} amountPaise
 * @returns {Promise<string>} plan_…
 */
async function razorpayPlanIdFor(plan, period, amountPaise) {
  const mode = env.razorpay.isLiveMode ? "live" : "test";
  const cacheKey = `${mode}:${plan}:${period}:${amountPaise}`;
  const stored = await Setting.findOne({ key: PLAN_IDS_SETTING }).lean();
  if (stored?.value?.[cacheKey]) return stored.value[cacheKey];

  const planId = await razorpay.createPlan({
    planKey: plan,
    label: PLAN_LABELS[plan],
    period,
    amountPaise,
  });
  await Setting.updateOne(
    { key: PLAN_IDS_SETTING },
    { $set: { [`value.${cacheKey}`]: planId } },
    { upsert: true }
  );
  logger.info(`[Billing] created Razorpay plan ${planId} for ${cacheKey}`);
  return planId;
}

/* ===== Keeping users.plan in step ===== */

/**
 * Recompute a person's plan from their subscriptions and save it if it changed.
 * @param {string} userId
 * @returns {Promise<string>} The plan now in effect
 */
export async function refreshUserPlan(userId) {
  const subscriptions = await Subscription.find({ userId }).lean();
  const plan = effectivePlan(subscriptions);
  const updated = await User.findOneAndUpdate(
    { _id: userId, plan: { $ne: plan } },
    { $set: { plan } },
    { returnDocument: "before", projection: { plan: 1 } }
  ).lean();
  if (updated) logger.info(`[Billing] plan ${updated.plan} → ${plan} userId=${userId}`);
  return plan;
}

/**
 * Apply Razorpay's view of a subscription to our record.
 * @param {Object} subscription - Mongoose document
 * @param {Object} entity - Razorpay subscription entity
 * @returns {Promise<{ startedAccess: boolean }>} startedAccess: it just became paid
 */
async function syncFromRazorpay(subscription, entity) {
  const hadAccess = hasAccess(subscription);
  Object.assign(subscription, fromRazorpaySubscription(entity));
  if (["cancelled", "completed"].includes(entity.status) && !subscription.cancelledAt) {
    subscription.cancelledAt = new Date();
  }
  await subscription.save();
  return { startedAccess: !hadAccess && hasAccess(subscription) };
}

/**
 * Record a captured payment (first charge or renewal). Safe to call twice.
 * @param {Object} subscription - Mongoose document
 * @param {Object} payment - Razorpay payment entity
 * @returns {Promise<void>}
 */
async function recordPayment(subscription, payment) {
  const status =
    payment.status === "captured"
      ? "captured"
      : payment.status === "refunded"
        ? "refunded"
        : "failed";
  await Payment.updateOne(
    { providerPaymentId: payment.id },
    {
      $set: {
        status,
        method: payment.method ?? null,
        providerInvoiceId: payment.invoice_id ?? null,
      },
      $setOnInsert: {
        userId: subscription.userId,
        subscriptionId: subscription._id,
        amountPaise: payment.amount,
        currency: payment.currency ?? "INR",
        plan: subscription.plan,
        paidAt: payment.created_at ? new Date(payment.created_at * 1000) : new Date(),
      },
    },
    { upsert: true }
  );
  if (status === "captured") {
    subscription.lastPaymentAt = new Date();
    subscription.failedPaymentAt = null;
    await subscription.save();
  }
}

/* ===== Listener actions ===== */

/**
 * The person's current paid subscription (the one giving access), if any.
 * @param {string} userId
 * @returns {Promise<Object|null>} Mongoose document
 */
async function currentSubscription(userId) {
  const subscriptions = await Subscription.find({ userId }).sort({ createdAt: -1 });
  return subscriptions.find((subscription) => hasAccess(subscription)) ?? null;
}

/**
 * Start buying a plan: create (or reuse) a Razorpay subscription for Checkout.
 * @param {{ userId: string }} viewer
 * @param {{ plan: "premium"|"creatorPro", period: "monthly"|"yearly" }} choice
 * @returns {Promise<Object>} What the Checkout widget needs
 * @throws {ApiError} 503 not available, 409 already on a paid plan
 */
export async function startCheckout({ userId }, { plan, period }) {
  if (!(await isCheckoutOpen())) throw razorpay.paymentsNotConfigured();
  const user = await User.findById(userId).select("name email").lean();
  if (!user) throw ApiError.notFound("Account not found", { code: ERROR_CODES.NOT_FOUND });

  const current = await currentSubscription(userId);
  if (current) {
    throw ApiError.conflict(
      current.cancelAtPeriodEnd
        ? `Your ${PLAN_LABELS[current.plan]} plan runs until ${shortDate(current.currentPeriodEnd)}. You can choose a new plan after that.`
        : `You already have ${PLAN_LABELS[current.plan]}. To change plans, cancel it in your profile first.`,
      { code: ERROR_CODES.ALREADY_SUBSCRIBED }
    );
  }

  const { planPrices } = await getSettings();
  const amountPaise = Math.round(planPrices[plan][period] * 100);
  const planId = await razorpayPlanIdFor(plan, period, amountPaise);

  // Someone who closed Checkout and tries again gets the same unpaid subscription
  const recent = await Subscription.findOne({
    userId,
    provider: "razorpay",
    status: "created",
    providerPlanId: planId,
    createdAt: { $gte: new Date(Date.now() - REUSE_UNPAID_CHECKOUT_MS) },
  }).lean();
  let subscriptionId = recent?.providerSubscriptionId;
  if (!subscriptionId) {
    const entity = await razorpay.createSubscription({
      planId,
      totalCount: SUBSCRIPTION_TOTAL_COUNT[period],
      notes: { userId: String(userId), plan, period },
    });
    subscriptionId = entity.id;
    await Subscription.create({
      userId,
      plan,
      period,
      provider: "razorpay",
      providerSubscriptionId: entity.id,
      providerPlanId: planId,
      status: entity.status ?? "created",
      amountPaise,
    });
    logger.info(`[Billing] checkout started ${subscriptionId} ${plan}/${period} userId=${userId}`);
  }

  return {
    keyId: env.razorpay.keyId,
    subscriptionId,
    plan,
    planLabel: PLAN_LABELS[plan],
    period,
    amountPaise,
    currency: "INR",
    prefill: { name: user.name, email: user.email },
  };
}

/**
 * After Checkout says "paid": check Razorpay's signature, then sync.
 * @param {{ userId: string }} viewer
 * @param {{ paymentId: string, subscriptionId: string, signature: string }} result
 * @returns {Promise<Object>} The person's billing summary
 * @throws {ApiError} 400 PAYMENT_INVALID when the signature doesn't match
 */
export async function confirmCheckout({ userId }, { paymentId, subscriptionId, signature }) {
  if (!razorpay.verifyCheckoutSignature({ paymentId, subscriptionId, signature })) {
    logger.warn(`[Billing] checkout signature mismatch ${subscriptionId} userId=${userId}`);
    throw ApiError.badRequest(
      "We couldn't verify this payment. If money was taken, it will be refunded or your plan will start shortly.",
      {
        code: ERROR_CODES.PAYMENT_INVALID,
      }
    );
  }
  const subscription = await Subscription.findOne({
    userId,
    providerSubscriptionId: subscriptionId,
  });
  if (!subscription)
    throw ApiError.notFound("Subscription not found", { code: ERROR_CODES.NOT_FOUND });

  const [entity, payment] = await Promise.all([
    razorpay.fetchSubscription(subscriptionId),
    razorpay.fetchPayment(paymentId),
  ]);
  const { startedAccess } = await syncFromRazorpay(subscription, entity);
  await recordPayment(subscription, payment);
  await refreshUserPlan(userId);
  if (startedAccess) await welcome(subscription);
  return getMyBilling({ userId });
}

/**
 * Welcome email for a plan that just started.
 * @param {Object} subscription
 * @returns {Promise<void>}
 */
async function welcome(subscription) {
  const user = await User.findById(subscription.userId).select("name email").lean();
  notify(
    user?.email,
    subscriptionStartedEmail({
      name: user?.name ?? "there",
      planLabel: PLAN_LABELS[subscription.plan],
      renewsOn: shortDate(subscription.currentPeriodEnd),
      manageUrl: manageUrl(),
    })
  );
}

/**
 * Plan, subscription and payment history for the profile page.
 * @param {{ userId: string }} viewer
 * @returns {Promise<Object>}
 */
export async function getMyBilling({ userId }) {
  const [user, subscriptions, payments, sale] = await Promise.all([
    User.findById(userId).select("plan").lean(),
    Subscription.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    Payment.find({ userId }).sort({ paidAt: -1 }).limit(PAYMENTS_SHOWN).lean(),
    getPlansForSale(),
  ]);
  const active = subscriptions.find((subscription) => hasAccess(subscription)) ?? null;
  return {
    plan: user?.plan ?? "free",
    planLabel: PLAN_LABELS[user?.plan ?? "free"],
    checkoutAvailable: sale.available,
    subscription: active && {
      id: String(active._id),
      plan: active.plan,
      planLabel: PLAN_LABELS[active.plan],
      period: active.period,
      provider: active.provider,
      status: active.status,
      amountPaise: active.amountPaise,
      currentPeriodEnd: active.currentPeriodEnd,
      cancelAtPeriodEnd:
        active.cancelAtPeriodEnd || ["cancelled", "completed"].includes(active.status),
      paymentProblem: active.status === "pending" || Boolean(active.failedPaymentAt),
      canCancel:
        active.provider === "razorpay" &&
        !active.cancelAtPeriodEnd &&
        ["authenticated", "active", "pending"].includes(active.status),
    },
    payments: payments.map((payment) => ({
      id: String(payment._id),
      amountPaise: payment.amountPaise,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      plan: payment.plan,
      paidAt: payment.paidAt,
    })),
  };
}

/**
 * Cancel at the end of the paid period (access continues until then).
 * @param {{ userId: string }} viewer
 * @returns {Promise<Object>} The person's billing summary
 * @throws {ApiError} 404 when there's nothing to cancel
 */
export async function cancelMySubscription({ userId }) {
  const current = await currentSubscription(userId);
  if (!current || current.provider !== "razorpay" || current.cancelAtPeriodEnd) {
    throw ApiError.notFound("There's no active subscription to cancel", {
      code: ERROR_CODES.NOT_FOUND,
    });
  }
  // A plan that was never charged ends straight away; a paid one at the end of its period
  const atCycleEnd = current.status === "active";
  const entity = await razorpay.cancelSubscription(current.providerSubscriptionId, atCycleEnd);
  current.cancelAtPeriodEnd = true;
  current.cancelledAt = new Date();
  await syncFromRazorpay(current, entity);
  await refreshUserPlan(userId);
  logger.info(
    `[Billing] cancelled ${current.providerSubscriptionId} atCycleEnd=${atCycleEnd} userId=${userId}`
  );
  return getMyBilling({ userId });
}

/* ===== Webhooks ===== */

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.pending",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.completed",
  "subscription.paused",
  "subscription.resumed",
  "subscription.updated",
]);

/**
 * Apply one Razorpay webhook. Verified with the webhook secret; each event id
 * is applied once (Razorpay can deliver an event more than once).
 * @param {Buffer} rawBody - Exactly as received
 * @param {{ signature?: string, eventId?: string }} headers
 * @returns {Promise<{ applied: boolean, reason?: string }>}
 * @throws {ApiError} 400 for a bad signature
 */
export async function handleWebhook(rawBody, { signature, eventId }) {
  if (!razorpay.verifyWebhookSignature(rawBody, signature)) {
    logger.warn("[Billing] webhook with a bad signature rejected");
    throw ApiError.badRequest("Invalid signature", { code: ERROR_CODES.PAYMENT_INVALID });
  }
  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw ApiError.badRequest("Invalid JSON");
  }
  if (!SUBSCRIPTION_EVENTS.has(event.event)) return { applied: false, reason: "ignored" };

  const entity = event.payload?.subscription?.entity;
  if (!entity?.id) return { applied: false, reason: "no subscription" };
  try {
    await BillingEvent.create({
      eventId: eventId || `${event.event}:${entity.id}:${event.created_at}`,
      type: event.event,
      providerSubscriptionId: entity.id,
    });
  } catch (error) {
    if (error.code === 11000) return { applied: false, reason: "duplicate" };
    throw error;
  }

  const subscription = await Subscription.findOne({ providerSubscriptionId: entity.id });
  if (!subscription) {
    logger.warn(`[Billing] webhook ${event.event} for unknown subscription ${entity.id}`);
    return { applied: false, reason: "unknown subscription" };
  }

  const { startedAccess } = await syncFromRazorpay(subscription, entity);
  const payment = event.payload?.payment?.entity;
  if (payment && event.event === "subscription.charged") await recordPayment(subscription, payment);

  if (event.event === "subscription.pending" || event.event === "subscription.halted") {
    subscription.failedPaymentAt = new Date();
    await subscription.save();
    const user = await User.findById(subscription.userId).select("name email").lean();
    notify(
      user?.email,
      paymentFailedEmail({
        name: user?.name ?? "there",
        planLabel: PLAN_LABELS[subscription.plan],
        manageUrl: manageUrl(),
        isFinal: event.event === "subscription.halted",
      })
    );
  }
  await refreshUserPlan(subscription.userId);
  if (startedAccess) await welcome(subscription);
  logger.info(`[Billing] webhook ${event.event} applied to ${entity.id} (${subscription.status})`);
  return { applied: true };
}

/* ===== Background job ===== */

/**
 * Hourly: end paid access when a cancelled plan's last paid day has passed,
 * expire finished manual grants, and fix any plan that drifted.
 * @returns {Promise<{ checked: number }>}
 */
export async function expireSubscriptionsJob() {
  const now = new Date();
  await Subscription.updateMany(
    { provider: "manual", status: "active", currentPeriodEnd: { $ne: null, $lte: now } },
    { $set: { status: "expired" } }
  );
  const ended = await Subscription.distinct("userId", {
    currentPeriodEnd: { $lte: now, $gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
  });
  const paidUsers = await User.distinct("_id", { plan: { $in: PAID_PLAN_KEYS } });
  const userIds = [...new Set([...ended, ...paidUsers].map(String))];
  for (const userId of userIds) await refreshUserPlan(userId);
  return { checked: userIds.length };
}
