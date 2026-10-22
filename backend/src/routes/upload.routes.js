/**
 * Upload signature routes: /api/uploads
 */
import { Router } from "express";
import * as uploadController from "../controllers/upload.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { uploadSignLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.post("/avatar/sign", requireAuth, uploadSignLimiter, uploadController.signAvatarUpload);

export default router;
