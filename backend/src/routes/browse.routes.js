/**
 * Browse routes (PRD BRW-1/2/3, roadmap Day 7), mounted at /api:
 * GET /browse/genres(/:slug) · GET /browse/vibes(/:slug) · GET /trending · GET /new-releases
 */
import { Router } from "express";
import * as browseController from "../controllers/browse.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  browsePageQuerySchema,
  catalogQuerySchema,
  categoryParamsSchema,
  trendingQuerySchema,
} from "../validators/search.validator.js";

const router = Router();
const catalogQuery = validate({ query: catalogQuerySchema });
const categoryPage = validate({ params: categoryParamsSchema, query: browsePageQuerySchema });

router.get("/browse/genres", catalogQuery, browseController.listCategories("genre"));
router.get("/browse/genres/:slug", categoryPage, browseController.getCategory("genre"));
router.get("/browse/vibes", catalogQuery, browseController.listCategories("vibe"));
router.get("/browse/vibes/:slug", categoryPage, browseController.getCategory("vibe"));
router.get("/trending", validate({ query: trendingQuerySchema }), browseController.trending);
router.get(
  "/new-releases",
  validate({ query: browsePageQuerySchema }),
  browseController.newReleases
);

export default router;
