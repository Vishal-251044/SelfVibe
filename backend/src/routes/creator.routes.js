/**
 * Creator routes: /api/creator
 */
import { Router } from "express";
import * as creatorController from "../controllers/creator.controller.js";
import * as trackController from "../controllers/track.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { becomeCreatorSchema, updateCreatorSchema } from "../validators/artist.validator.js";
import { listTracksQuerySchema } from "../validators/track.validator.js";

const router = Router();

router.use(requireAuth);

router.post("/become", validate({ body: becomeCreatorSchema }), creatorController.becomeCreator);
router.get("/me", creatorController.getMyArtist);
router.patch(
  "/me",
  requireRole("creator"),
  validate({ body: updateCreatorSchema }),
  creatorController.updateMyArtist
);
router.get(
  "/tracks",
  requireRole("creator"),
  validate({ query: listTracksQuerySchema }),
  trackController.listMyTracks
);

export default router;
