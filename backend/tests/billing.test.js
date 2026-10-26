/**
 * Unit tests for plans & payments (PRD §10.10): Razorpay signature checks,
 * who keeps a paid plan in each subscription state, mapping Razorpay's
 * subscription entity, monthly recurring revenue, and the request validators.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../src/services/billing/razorpay.provider.js";
import {
  effectivePlan,
  fromRazorpaySubscription,
  hasAccess,
  monthlyRecurringPaise,
} from "../src/services/billing/subscriptionAccess.js";
import {
  checkoutSchema,
  confirmCheckoutSchema,
  grantPlanSchema,
  planPricesSchema,
} from "../src/validators/billing.validator.js";
import { settingsSchema } from "../src/validators/adminPlatform.validator.js";
import { hasPermission } from "../src/config/permissions.js";

const SECRET = "test_key_secret_123";
const hmac = (text, secret = SECRET) => createHmac("sha256", secret).update(text).digest("hex");
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-01T10:00:00Z");
const later = new Date(NOW.getTime() + 5 * DAY);
const earlier = new Date(NOW.getTime() - DAY);

describe("Razorpay signatures", () => {
  it("accepts a checkout signature made with the key secret", () => {
    const signature = hmac("pay_ABC123|sub_XYZ789");
    assert.equal(
      verifyCheckoutSignature(
        { paymentId: "pay_ABC123", subscriptionId: "sub_XYZ789", signature },
        SECRET
      ),
      true
    );
  });

  it("rejects a signature for another subscription, another secret, or junk", () => {
    const signature = hmac("pay_ABC123|sub_XYZ789");
    const check = (input, secret = SECRET) => verifyCheckoutSignature(input, secret);
    assert.equal(
      check({ paymentId: "pay_ABC123", subscriptionId: "sub_OTHER1", signature }),
      false
    );
    assert.equal(
      check({ paymentId: "pay_ABC123", subscriptionId: "sub_XYZ789", signature }, "other_secret"),
      false
    );
    assert.equal(
      check({ paymentId: "pay_ABC123", subscriptionId: "sub_XYZ789", signature: "abc" }),
      false
    );
    assert.equal(
      check({ paymentId: "pay_ABC123", subscriptionId: "sub_XYZ789", signature: undefined }),
      false
    );
    assert.equal(check({ paymentId: "pay_A", subscriptionId: "sub_B", signature }, ""), false);
  });

  it("checks webhooks against the exact raw body", () => {
    const body = Buffer.from('{"event":"subscription.charged","payload":{}}');
    const signature = hmac(body, "whsec");
    assert.equal(verifyWebhookSignature(body, signature, "whsec"), true);
    // Same JSON with different spacing is a different body
    const reformatted = Buffer.from('{ "event": "subscription.charged", "payload": {} }');
    assert.equal(verifyWebhookSignature(reformatted, signature, "whsec"), false);
    assert.equal(verifyWebhookSignature(body, signature, "other"), false);
    assert.equal(verifyWebhookSignature(body, signature, ""), false);
  });
});

describe("who keeps a paid plan", () => {
  const razorpay = (status, currentPeriodEnd = later) => ({
    provider: "razorpay",
    plan: "premium",
    status,
    currentPeriodEnd,
  });

  it("authenticated, active and pending (renewal retrying) keep access", () => {
    for (const status of ["authenticated", "active", "pending"]) {
      assert.equal(hasAccess(razorpay(status), NOW), true, status);
    }
  });

  it("cancelled / completed keep access only until the paid period ends", () => {
    assert.equal(hasAccess(razorpay("cancelled", later), NOW), true);
    assert.equal(hasAccess(razorpay("cancelled", earlier), NOW), false);
    assert.equal(hasAccess(razorpay("completed", earlier), NOW), false);
    assert.equal(hasAccess(razorpay("cancelled", null), NOW), false);
  });

  it("halted, expired and unpaid (created) give no access", () => {
    for (const status of ["halted", "expired", "created"]) {
      assert.equal(hasAccess(razorpay(status), NOW), false, status);
    }
  });

  it("manual grants last until their end date, or forever without one", () => {
    const manual = (status, currentPeriodEnd) => ({
      provider: "manual",
      plan: "premium",
      status,
      currentPeriodEnd,
    });
    assert.equal(hasAccess(manual("active", null), NOW), true);
    assert.equal(hasAccess(manual("active", later), NOW), true);
    assert.equal(hasAccess(manual("active", earlier), NOW), false);
    assert.equal(hasAccess(manual("expired", null), NOW), false);
  });

  it("the biggest plan with access wins; nothing → free", () => {
    assert.equal(effectivePlan([], NOW), "free");
    assert.equal(effectivePlan([razorpay("halted")], NOW), "free");
    assert.equal(
      effectivePlan(
        [
          razorpay("active"),
          { provider: "manual", plan: "creatorPro", status: "active", currentPeriodEnd: null },
        ],
        NOW
      ),
      "creatorPro"
    );
    assert.equal(
      effectivePlan(
        [
          razorpay("active"),
          { provider: "manual", plan: "creatorPro", status: "expired", currentPeriodEnd: null },
        ],
        NOW
      ),
      "premium"
    );
  });
});

describe("Razorpay subscription mapping", () => {
  it("converts seconds to dates and uses charge_at before the first charge", () => {
    const active = fromRazorpaySubscription({
      status: "active",
      current_start: 1_793_000_000,
      current_end: 1_795_600_000,
    });
    assert.equal(active.status, "active");
    assert.equal(active.currentPeriodEnd.getTime(), 1_795_600_000_000);
    const fresh = fromRazorpaySubscription({
      status: "authenticated",
      current_end: null,
      charge_at: 1_793_100_000,
    });
    assert.equal(fresh.currentPeriodEnd.getTime(), 1_793_100_000_000);
    assert.equal(fresh.currentPeriodStart, null);
  });
});

describe("monthly recurring revenue", () => {
  it("adds monthly prices and a twelfth of yearly ones", () => {
    assert.equal(
      monthlyRecurringPaise([
        { period: "monthly", amountPaise: 9900 },
        { period: "yearly", amountPaise: 99000 },
        { period: null, amountPaise: 0 },
      ]),
      9900 + 8250
    );
  });
});

describe("billing validators and permissions", () => {
  it("only sells paid plans, monthly or yearly", () => {
    assert.equal(checkoutSchema.safeParse({ plan: "premium", period: "yearly" }).success, true);
    assert.equal(checkoutSchema.safeParse({ plan: "free", period: "monthly" }).success, false);
    assert.equal(checkoutSchema.safeParse({ plan: "premium", period: "weekly" }).success, false);
  });

  it("checkout results must look like Razorpay ids and a SHA-256 signature", () => {
    const ok = {
      paymentId: "pay_ABC1234",
      subscriptionId: "sub_XYZ7890",
      signature: "a".repeat(64),
    };
    assert.equal(confirmCheckoutSchema.safeParse(ok).success, true);
    assert.equal(
      confirmCheckoutSchema.safeParse({ ...ok, paymentId: "sub_ABC1234" }).success,
      false
    );
    assert.equal(confirmCheckoutSchema.safeParse({ ...ok, signature: "nope" }).success, false);
  });

  it("granting a plan needs a reason; prices are whole rupees", () => {
    const grant = { userId: "a".repeat(24), plan: "premium", days: 30, note: "beta tester" };
    assert.equal(grantPlanSchema.safeParse(grant).success, true);
    assert.equal(grantPlanSchema.safeParse({ ...grant, note: "" }).success, false);
    assert.equal(grantPlanSchema.safeParse({ ...grant, days: null }).success, true);
    assert.equal(
      planPricesSchema.safeParse({ premium: { monthly: 99, yearly: 990 } }).success,
      true
    );
    assert.equal(
      planPricesSchema.safeParse({ premium: { monthly: 99.5, yearly: 990 } }).success,
      false
    );
    assert.equal(
      planPricesSchema.safeParse({ premium: { monthly: 0, yearly: 990 } }).success,
      false
    );
    assert.equal(
      settingsSchema.safeParse({ planPrices: { creatorPro: { monthly: 149, yearly: 1490 } } })
        .success,
      true
    );
    assert.equal(settingsSchema.safeParse({ features: { payments: false } }).success, true);
  });

  it("Admins see revenue, only the Owner grants plans, Moderators neither", () => {
    assert.equal(hasPermission("admin", "billing.view"), true);
    assert.equal(hasPermission("admin", "billing.manage"), false);
    assert.equal(hasPermission("owner", "billing.manage"), true);
    assert.equal(hasPermission("moderator", "billing.view"), false);
    assert.equal(hasPermission("contentManager", "billing.view"), false);
  });
});
