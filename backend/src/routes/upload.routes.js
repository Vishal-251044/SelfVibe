/**
 * Upload signature routes: /api/uploads
 */
import { Router } from "express";
import * as uploadController from "../controllers/upload.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { uploadSignLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { signUploadSchema } from "../validators/track.validator.js";
import { requireFeature } from "../middlewares/platform.middleware.js";

const router = Router();

router.post("/avatar/sign", requireAuth, uploadSignLimiter, uploadController.signAvatarUpload);
// Any signed-in user: audio + cover uploads straight to storage (PRD CRT-1, CRT-3)
router.post(
  "/sign",
  requireAuth,
  requireFeature("uploads"),
  uploadSignLimiter,
  validate({ body: signUploadSchema }),
  uploadController.signMediaUpload
);

export default router;
