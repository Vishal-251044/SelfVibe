/**
 * Combines every feature router under /api.
 */
import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import adminAuthRoutes from "./adminAuth.routes.js";
import onboardingRoutes from "./onboarding.routes.js";
import uploadRoutes from "./upload.routes.js";
import { requireDatabase } from "../middlewares/database.middleware.js";

const router = Router();

router.use("/health", healthRoutes);

// Everything below needs MongoDB: answer 503 right away if it is down
router.use(requireDatabase);

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/uploads", uploadRoutes);
router.use("/admin/auth", adminAuthRoutes);

export default router;
