/**
 * Subscription: one paid plan for one person (PRD §13 `subscriptions`,
 * §10.10). Razorpay subscriptions are kept in sync by webhooks; "manual"
 * ones are plans the Owner granted from the console (gifts, refunds, staff).
 */
import mongoose from "mongoose";
import {
  BILLING_PERIODS,
  BILLING_PROVIDERS,
  PAID_PLAN_KEYS,
  SUBSCRIPTION_STATUS,
} from "../config/constants.js";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, enum: PAID_PLAN_KEYS, required: true },
    period: { type: String, enum: [...BILLING_PERIODS, null], default: null }, // null for manual grants
    provider: { type: String, enum: BILLING_PROVIDERS, required: true },
    providerSubscriptionId: { type: String, default: null }, // sub_… for Razorpay
    providerPlanId: { type: String, default: null }, // plan_…
    status: { type: String, enum: SUBSCRIPTION_STATUS, default: "created" },
    amountPaise: { type: Number, default: 0, min: 0 }, // price per period
    currency: { type: String, default: "INR" },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null }, // paid access lasts until here
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    lastPaymentAt: { type: Date, default: null },
    failedPaymentAt: { type: Date, default: null }, // last failed renewal (shown as a warning)
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // manual only
    note: { type: String, maxlength: 200, default: "" },
  },
  { timestamps: true }
);

subscriptionSchema.index(
  { providerSubscriptionId: 1 },
  { unique: true, partialFilterExpression: { providerSubscriptionId: { $type: "string" } } }
);
subscriptionSchema.index({ userId: 1, createdAt: -1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 }); // expiry job, console filters

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
