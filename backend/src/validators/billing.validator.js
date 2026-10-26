/**
 * Request validation for plans & payments (PRD §10.10).
 */
import { z } from "zod";
import { BILLING_PERIODS, PAID_PLAN_KEYS } from "../config/constants.js";

const objectId = (label) => z.string().regex(/^[0-9a-f]{24}$/i, { error: `Invalid ${label}` });
// Razorpay ids look like sub_ABC123 / pay_ABC123
const razorpayId = (prefix) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[A-Za-z0-9]{6,40}$`), { error: "Invalid payment reference" });

export const checkoutSchema = z.object({
  plan: z.enum(PAID_PLAN_KEYS),
  period: z.enum(BILLING_PERIODS),
});

/** What Razorpay Checkout hands back after a successful payment. */
export const confirmCheckoutSchema = z.object({
  paymentId: razorpayId("pay"),
  subscriptionId: razorpayId("sub"),
  signature: z.string().regex(/^[0-9a-f]{64}$/, { error: "Invalid payment signature" }),
});

export const adminSubscriptionsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["all", "access", "problem", "ended"]).default("all"),
  plan: z.enum(PAID_PLAN_KEYS).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const grantPlanSchema = z.object({
  userId: objectId("user"),
  plan: z.enum(PAID_PLAN_KEYS),
  // null = no end date
  days: z.number().int().min(1).max(3650).nullable(),
  note: z.string().trim().min(3, { error: "Say why (e.g. 'refund', 'beta tester')" }).max(200),
});

export const subscriptionIdParamsSchema = z.object({ id: objectId("subscription") });

/** Owner settings: whole rupees per plan and period. */
const rupees = z.number().int().min(1).max(100000);
export const planPricesSchema = z
  .object({
    premium: z.object({ monthly: rupees, yearly: rupees }),
    creatorPro: z.object({ monthly: rupees, yearly: rupees }),
  })
  .partial();
