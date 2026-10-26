/**
 * Billing routes (PRD §12): /api/billing/*. The Razorpay webhook has its own
 * router (billingWebhookRouter), mounted before maintenance mode so renewals
 * keep arriving while the app is down.
 */
import { Router } from "express";
import * as billing from "../controllers/billing.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { checkoutLimiter } from "../middlewares/rateLimit.middleware.js";
import { checkoutSchema, confirmCheckoutSchema } from "../validators/billing.validator.js";

const router = Router();

router.get("/plans", billing.plans);
router.post(
  "/checkout",
  requireAuth,
  checkoutLimiter,
  validate({ body: checkoutSchema }),
  billing.checkout
);
router.post(
  "/confirm",
  requireAuth,
  checkoutLimiter,
  validate({ body: confirmCheckoutSchema }),
  billing.confirm
);
router.get("/me", requireAuth, billing.me);
router.post("/cancel", requireAuth, checkoutLimiter, billing.cancel);

/** POST /api/billing/webhook — the body arrives raw (see app.js) for the signature check */
export const billingWebhookRouter = Router();
billingWebhookRouter.post("/billing/webhook", billing.webhook);

export default router;
