/**
 * Search routes (PRD SRC-1/2/3, VOC-4, roadmap Day 7): /api/search
 * GET / · GET /voice · GET/POST/DELETE /recent
 */
import { Router } from "express";
import * as searchController from "../controllers/search.controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.middleware.js";
import { searchLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  recentSearchBodySchema,
  recentSearchDeleteQuerySchema,
  searchQuerySchema,
} from "../validators/search.validator.js";

const router = Router();
const searchQuery = validate({ query: searchQuerySchema });

router.get("/", optionalAuth, searchLimiter, searchQuery, searchController.search);
router.get("/voice", optionalAuth, searchLimiter, searchQuery, searchController.voiceSearch);

router.get("/recent", requireAuth, searchController.listRecent);
router.post(
  "/recent",
  requireAuth,
  validate({ body: recentSearchBodySchema }),
  searchController.addRecent
);
router.delete(
  "/recent",
  requireAuth,
  validate({ query: recentSearchDeleteQuerySchema }),
  searchController.removeRecent
);

export default router;
