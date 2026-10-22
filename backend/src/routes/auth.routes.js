/**
 * Listener / creator auth routes: /api/auth
 */
import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  loginLimiter,
  refreshLimiter,
  registerLimiter,
} from "../middlewares/rateLimit.middleware.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

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

export default router;
