/**
 * Report routes: /api/reports
 */
import { Router } from "express";
import { fileReport } from "../controllers/report.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { reportLimiter } from "../middlewares/rateLimit.middleware.js";
import { reportSchema } from "../validators/track.validator.js";

const router = Router();

router.post("/", requireAuth, reportLimiter, validate({ body: reportSchema }), fileReport);

export default router;
