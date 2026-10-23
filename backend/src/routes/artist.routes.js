/**
 * Public artist routes: /api/artists
 */
import { Router } from "express";
import { getArtistPage } from "../controllers/creator.controller.js";

const router = Router();

router.get("/:idOrSlug", getArtistPage);

export default router;
