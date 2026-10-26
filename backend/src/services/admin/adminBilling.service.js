/**
 * Console → Subscriptions (PRD §10.10, F33): who pays for what, revenue at a
 * glance, and Owner-granted plans (gifts, refunds, testers). Granting writes
 * a "manual" subscription, so users.plan keeps following subscriptions only.
 */
import mongoose from "mongoose";
import { Subscription } from "../../models/subscription.model.js";
import { Payment } from "../../models/payment.model.js";
import { User } from "../../models/user.model.js";
import { refreshUserPlan } from "../billing/billing.service.js";
import { hasAccess, monthlyRecurringPaise } from "../billing/subscriptionAccess.js";
import { buildPageMeta, containsRegex } from "../../helpers/genericFunctions.js";
import { ERROR_CODES, PAID_PLAN_KEYS, PLAN_LABELS } from "../../config/constants.js";
import { ApiError } from "../../utils/ApiError.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One subscription row for the console.
 * @param {Object} subscription - Lean, userId populated
 * @returns {Object}
 */
function toAdminSubscription(subscription) {
  const user = subscription.userId;
  return {
    id: String(subscription._id),
    user: user?._id ? { id: String(user._id), name: user.name, email: user.email } : null,
    plan: subscription.plan,
    planLabel: PLAN_LABELS[subscription.plan],
    period: subscription.period,
    provider: subscription.provider,
    providerSubscriptionId: subscription.providerSubscriptionId,
    status: subscription.status,
    hasAccess: hasAccess(subscription),
    amountPaise: subscription.amountPaise,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    failedPaymentAt: subscription.failedPaymentAt,
    note: subscription.note,
    createdAt: subscription.createdAt,
  };
}

/**
 * Search subscriptions.
 * @param {{ q?: string, status?: "access"|"problem"|"ended"|"all", plan?: string, page: number, limit: number }} query
 * @returns {Promise<{ items: Object[], meta: Object }>}
 */
export async function listSubscriptions({ q, status = "all", plan, page = 1, limit = 25 }) {
  const where = { status: { $ne: "created" } }; // abandoned checkouts aren't subscriptions
  if (plan) where.plan = plan;
  if (status === "problem") where.$or = [{ status: { $in: ["pending", "halted"] } }];
  if (status === "ended") where.status = { $in: ["cancelled", "completed", "expired", "halted"] };
  if (status === "access")
    where.status = { $in: ["authenticated", "active", "pending", "cancelled"] };
  if (q) {
    const users = await User.find({
      $or: [{ name: containsRegex(q) }, { email: containsRegex(q) }],
    })
      .select("_id")
      .limit(200)
      .lean();
    where.userId = { $in: users.map((user) => user._id) };
  }
  const [rows, total] = await Promise.all([
    Subscription.find(where)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "name email")
      .lean(),
    Subscription.countDocuments(where),
  ]);
  let items = rows.map(toAdminSubscription);
  // "cancelled" stays in the access filter only while the paid period lasts
  if (status === "access") items = items.filter((item) => item.hasAccess);
  return { items, meta: buildPageMeta(total, page, limit) };
}

/**
 * Subscribers and revenue for the console (Dashboard + Subscriptions page).
 * @returns {Promise<{ subscribers: Object, mrrPaise: number, revenue30dPaise: number, failedRenewals: number }>}
 */
export async function getBillingStats() {
  const candidates = await Subscription.find({
    status: { $in: ["authenticated", "active", "pending", "cancelled", "completed"] },
  })
    .select("plan period provider status amountPaise currentPeriodEnd cancelAtPeriodEnd")
    .lean();
  const withAccess = candidates.filter((subscription) => hasAccess(subscription));
  const subscribers = Object.fromEntries(
    PAID_PLAN_KEYS.map((plan) => [plan, withAccess.filter((sub) => sub.plan === plan).length])
  );
  // Recurring revenue = plans that will renew (not ones already set to end)
  const paying = withAccess.filter(
    (sub) =>
      sub.provider === "razorpay" &&
      !sub.cancelAtPeriodEnd &&
      ["authenticated", "active", "pending"].includes(sub.status)
  );
  const [revenue] = await Payment.aggregate([
    { $match: { status: "captured", paidAt: { $gte: new Date(Date.now() - 30 * DAY_MS) } } },
    { $group: { _id: null, total: { $sum: "$amountPaise" } } },
  ]);
  return {
    subscribers: { ...subscribers, total: withAccess.length },
    mrrPaise: monthlyRecurringPaise(paying),
    revenue30dPaise: revenue?.total ?? 0,
    failedRenewals: withAccess.filter((sub) => sub.status === "pending").length,
  };
}

/**
 * Give someone a paid plan without payment (Owner).
 * @param {{ userId: string, plan: string, days: number|null, note: string }} input - days null = no end
 * @param {string} staffId
 * @returns {Promise<{ after: Object }>}
 * @throws {ApiError} 404 unknown user
 */
export async function grantPlan({ userId, plan, days, note }, staffId) {
  if (!mongoose.isValidObjectId(userId) || !(await User.exists({ _id: userId }))) {
    throw ApiError.notFound("User not found", { code: ERROR_CODES.NOT_FOUND });
  }
  const subscription = await Subscription.create({
    userId,
    plan,
    provider: "manual",
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: days ? new Date(Date.now() + days * DAY_MS) : null,
    grantedBy: staffId,
    note,
  });
  const effective = await refreshUserPlan(userId);
  return {
    after: { subscriptionId: String(subscription._id), plan, days, note, userPlan: effective },
  };
}

/**
 * End a plan the Owner granted (paid Razorpay plans are cancelled by the person
 * or from the Razorpay dashboard, so refunds stay in one place).
 * @param {string} subscriptionId
 * @returns {Promise<{ before: Object, after: Object }>}
 * @throws {ApiError} 404 not found, 409 not a manual grant
 */
export async function revokeGrant(subscriptionId) {
  const subscription = mongoose.isValidObjectId(subscriptionId)
    ? await Subscription.findById(subscriptionId)
    : null;
  if (!subscription) {
    throw ApiError.notFound("Subscription not found", { code: ERROR_CODES.NOT_FOUND });
  }
  if (subscription.provider !== "manual") {
    throw ApiError.conflict(
      "Paid subscriptions are cancelled from the Razorpay dashboard (so the refund is handled there too)",
      { code: ERROR_CODES.INVALID_STATE }
    );
  }
  const before = { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd };
  subscription.status = "expired";
  subscription.currentPeriodEnd = new Date();
  await subscription.save();
  const userPlan = await refreshUserPlan(subscription.userId);
  return { before, after: { status: "expired", userPlan } };
}
