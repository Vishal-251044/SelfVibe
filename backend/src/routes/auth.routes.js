/**
 * Listener / creator auth routes: /api/auth
 */
import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import * as googleAuthController from "../controllers/googleAuth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  forgotPasswordLimiter,
  loginLimiter,
  refreshLimiter,
  registerLimiter,
  resetPasswordLimiter,
} from "../middlewares/rateLimit.middleware.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  resetTokenQuerySchema,
} from "../validators/auth.validator.js";

const router = Router();

router.post(
  "/register",
  registerLimiter,
  validate({ body: registerSchema }),
  authController.register
);
router.post("/login", loginLimiter, validate({ body: loginSchema }), authController.login);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authController.logout);

// Forgot / reset password (PRD AUTH-4)
router.post(
  "/forgot",
  forgotPasswordLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);
router.get(
  "/reset/validate",
  resetPasswordLimiter,
  validate({ query: resetTokenQuerySchema }),
  authController.validateResetToken
);
router.post(
  "/reset",
  resetPasswordLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);

// Google OAuth (PRD AUTH-3) — browser navigations, not API calls
router.get("/google", refreshLimiter, googleAuthController.startGoogleSignIn);
router.get("/google/callback", refreshLimiter, googleAuthController.handleGoogleCallback);

export default router;
