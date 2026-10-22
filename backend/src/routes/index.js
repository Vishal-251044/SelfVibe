/**
 * Combines every feature router under /api.
 */
import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import adminAuthRoutes from "./adminAuth.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/admin/auth", adminAuthRoutes);

export default router;
