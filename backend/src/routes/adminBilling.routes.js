/**
 * Console billing routes: /api/admin/billing/* (subscriptions, revenue,
 * Owner-granted plans). Every write is audit-logged.
 */
import { Router } from "express";
import * as billing from "../controllers/billing.controller.js";
import { requirePermission } from "../middlewares/staff.middleware.js";
import { auditStaffWrites } from "../middlewares/audit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  adminSubscriptionsQuerySchema,
  grantPlanSchema,
  subscriptionIdParamsSchema,
} from "../validators/billing.validator.js";

const router = Router();
const can = (permission) => [requirePermission(permission), auditStaffWrites];

router.get(
  "/billing/subscriptions",
  can("billing.view"),
  validate({ query: adminSubscriptionsQuerySchema }),
  billing.adminList
);
router.get("/billing/stats", can("billing.view"), billing.adminStats);
router.post(
  "/billing/grant",
  can("billing.manage"),
  validate({ body: grantPlanSchema }),
  billing.adminGrant
);
router.post(
  "/billing/subscriptions/:id/revoke",
  can("billing.manage"),
  validate({ params: subscriptionIdParamsSchema }),
  billing.adminRevoke
);

export default router;
