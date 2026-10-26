/**
 * Payment: one charge on a subscription (first payment and every renewal),
 * shown as the person's billing history and in console revenue numbers.
 */
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
    provider: { type: String, default: "razorpay" },
    providerPaymentId: { type: String, required: true }, // pay_…
    providerInvoiceId: { type: String, default: null }, // inv_…
    amountPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["captured", "failed", "refunded"], required: true },
    method: { type: String, default: null }, // upi, card, netbanking…
    plan: { type: String, default: null },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

paymentSchema.index({ providerPaymentId: 1 }, { unique: true });
paymentSchema.index({ userId: 1, paidAt: -1 });
paymentSchema.index({ status: 1, paidAt: -1 }); // revenue totals

export const Payment = mongoose.model("Payment", paymentSchema);
