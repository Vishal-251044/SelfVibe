/**
 * Taste quiz routes: /api/onboarding
 */
import { Router } from "express";
import * as onboardingController from "../controllers/onboarding.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { artistSuggestionsQuerySchema } from "../validators/user.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/options", onboardingController.getOptions);
router.get(
  "/artists",
  validate({ query: artistSuggestionsQuerySchema }),
  onboardingController.getArtistSuggestions
);

export default router;
