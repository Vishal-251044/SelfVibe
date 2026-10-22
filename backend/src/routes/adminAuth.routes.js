/**
 * Staff console auth routes: /api/admin/auth
 */
import { Router } from "express";
import * as adminAuthController from "../controllers/adminAuth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { requireStaff } from "../middlewares/staff.middleware.js";
import {
  refreshLimiter,
  staffLoginLimiter,
  twoFactorLimiter,
} from "../middlewares/rateLimit.middleware.js";
import {
  staffLoginSchema,
  twoFactorSetupSchema,
  twoFactorVerifySchema,
} from "../validators/adminAuth.validator.js";

const router = Router();

router.post(
  "/login",
  staffLoginLimiter,
  validate({ body: staffLoginSchema }),
  adminAuthController.login
);
router.post(
  "/2fa/setup",
  twoFactorLimiter,
  validate({ body: twoFactorSetupSchema }),
  adminAuthController.setupTwoFactor
);
router.post(
  "/2fa/verify",
  twoFactorLimiter,
  validate({ body: twoFactorVerifySchema }),
  adminAuthController.verifyTwoFactor
);
router.post("/refresh", refreshLimiter, adminAuthController.refresh);
router.post("/logout", adminAuthController.logout);
router.get("/me", requireStaff(), adminAuthController.getMe);

export default router;
