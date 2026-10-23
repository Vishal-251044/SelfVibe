/**
 * Listening routes (roadmap Day 5): POST /api/events, GET /api/history
 */
import { Router } from "express";
import { getHistory, postListenEvents } from "../controllers/listening.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { listenEventsLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { historyQuerySchema, listenEventsSchema } from "../validators/listening.validator.js";

const router = Router();

router.post(
  "/events",
  requireAuth,
  listenEventsLimiter,
  validate({ body: listenEventsSchema }),
  postListenEvents
);
router.get("/history", requireAuth, validate({ query: historyQuerySchema }), getHistory);

export default router;
