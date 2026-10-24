/**
 * Public artist routes: /api/artists
 */
import { Router } from "express";
import { getArtistPage } from "../controllers/creator.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Guests can open artist pages; a signed-in viewer also learns if it is their own page
router.get("/:idOrSlug", optionalAuth, getArtistPage);

export default router;
