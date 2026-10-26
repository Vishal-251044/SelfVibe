/**
 * Who has which paid plan (PRD §10.10 "feature gates check the user's plan").
 * Pure functions, unit tested: the billing service and the expiry job use
 * them to keep users.plan in step with subscriptions.
 */
import { PAID_PLAN_KEYS, SUBSCRIPTION_ACCESS_STATUS } from "../../config/constants.js";

// Higher index = bigger plan, used when someone somehow has two
const PLAN_RANK = ["free", ...PAID_PLAN_KEYS];

/**
 * Does this subscription give paid access right now?
 * - authenticated / active / pending (renewal retrying): yes, until it changes
 * - cancelled / completed: yes until the end of the period already paid for
 * - halted (renewals failed), expired, created (never paid): no
 * - manual grants: active until currentPeriodEnd (null = no end)
 * @param {{ status: string, provider: string, currentPeriodEnd?: Date|null }} subscription
 * @param {Date} [now]
 * @returns {boolean}
 */
export function hasAccess(subscription, now = new Date()) {
  const end = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  if (subscription.provider === "manual") {
    return subscription.status === "active" && (!end || end > now);
  }
  if (SUBSCRIPTION_ACCESS_STATUS.includes(subscription.status)) return true;
  if (["cancelled", "completed"].includes(subscription.status)) return Boolean(end && end > now);
  return false;
}

/**
 * The plan a person should be on, from all their subscriptions.
 * @param {Array<{ plan: string, status: string, provider: string, currentPeriodEnd?: Date|null }>} subscriptions
 * @param {Date} [now]
 * @returns {"free"|"premium"|"creatorPro"}
 */
export function effectivePlan(subscriptions, now = new Date()) {
  return subscriptions
    .filter((subscription) => hasAccess(subscription, now))
    .reduce(
      (best, subscription) =>
        PLAN_RANK.indexOf(subscription.plan) > PLAN_RANK.indexOf(best) ? subscription.plan : best,
      "free"
    );
}

/**
 * Copy what Razorpay says about a subscription onto our record.
 * @param {Object} entity - Razorpay subscription entity (timestamps in seconds)
 * @returns {{ status: string, currentPeriodStart: Date|null, currentPeriodEnd: Date|null }}
 */
export function fromRazorpaySubscription(entity) {
  const toDate = (seconds) => (seconds ? new Date(seconds * 1000) : null);
  return {
    status: entity.status,
    currentPeriodStart: toDate(entity.current_start),
    // Before the first charge Razorpay has no current_end; charge_at is the next charge
    currentPeriodEnd: toDate(entity.current_end ?? entity.charge_at),
  };
}

/**
 * Monthly recurring revenue in paise: monthly prices plus yearly / 12.
 * @param {Array<{ period: string|null, amountPaise: number }>} subscriptions - Paying, active ones
 * @returns {number}
 */
export function monthlyRecurringPaise(subscriptions) {
  return Math.round(
    subscriptions.reduce(
      (total, subscription) =>
        total +
        (subscription.period === "yearly"
          ? subscription.amountPaise / 12
          : subscription.period === "monthly"
            ? subscription.amountPaise
            : 0),
      0
    )
  );
}
