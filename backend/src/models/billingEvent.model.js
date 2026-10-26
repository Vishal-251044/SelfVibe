/**
 * BillingEvent: a Razorpay webhook already processed. Razorpay may deliver
 * the same event more than once; its x-razorpay-event-id is stored here so a
 * repeat is acknowledged without being applied twice. Kept 30 days.
 */
import mongoose from "mongoose";

const BILLING_EVENT_TTL_SECONDS = 30 * 24 * 60 * 60;

const billingEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    type: { type: String, required: true }, // e.g. subscription.charged
    providerSubscriptionId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

billingEventSchema.index({ eventId: 1 }, { unique: true });
billingEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: BILLING_EVENT_TTL_SECONDS });

export const BillingEvent = mongoose.model("BillingEvent", billingEventSchema);
