/**
 * Signed-in user routes: /api/users
 */
import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { accountDeleteLimiter } from "../middlewares/rateLimit.middleware.js";
import {
  deleteAccountSchema,
  onboardingSchema,
  updateProfileSchema,
} from "../validators/user.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/me", userController.getMe);
router.patch("/me", validate({ body: updateProfileSchema }), userController.updateMe);
// Privacy (Day 10): download my data, delete my account
router.get("/me/export", userController.exportData);
router.delete(
  "/me",
  accountDeleteLimiter,
  validate({ body: deleteAccountSchema }),
  userController.deleteMe
);
router.get("/me/taste", userController.getTaste);
router.post(
  "/me/onboarding",
  validate({ body: onboardingSchema }),
  userController.completeOnboarding
);
router.post("/me/onboarding/skip", userController.skipOnboarding);

export default router;
