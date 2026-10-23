/**
 * Upload signature routes: /api/uploads
 */
import { Router } from "express";
import * as uploadController from "../controllers/upload.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { uploadSignLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { signUploadSchema } from "../validators/track.validator.js";

const router = Router();

router.post("/avatar/sign", requireAuth, uploadSignLimiter, uploadController.signAvatarUpload);
// Creators: audio + cover uploads straight to storage (PRD CRT-3)
router.post(
  "/sign",
  requireAuth,
  requireRole("creator"),
  uploadSignLimiter,
  validate({ body: signUploadSchema }),
  uploadController.signMediaUpload
);

export default router;
