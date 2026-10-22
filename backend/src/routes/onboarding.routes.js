/**
 * Taste quiz routes: /api/onboarding
 */
import { Router } from "express";
import * as onboardingController from "../controllers/onboarding.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/options", requireAuth, onboardingController.getOptions);

export default router;
