/**
 * Small public routes (roadmap Day 9), mounted at /api:
 * GET /settings/public · GET /home/sections · GET/POST /admin/invites/:token
 */
import { Router } from "express";
import { publicSettings } from "../controllers/platform.controller.js";
import { publicSections } from "../controllers/curation.controller.js";
import { acceptInvite, getInvite } from "../controllers/adminPlatform.controller.js";
import { loginLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  acceptInviteSchema,
  catalogOnlyQuerySchema,
  inviteTokenParamsSchema,
} from "../validators/adminPlatform.validator.js";

const router = Router();
const tokenParams = validate({ params: inviteTokenParamsSchema });

router.get("/settings/public", publicSettings);
router.get("/home/sections", validate({ query: catalogOnlyQuerySchema }), publicSections);
// Invite links work without a console session (the invitee isn't staff yet)
router.get("/admin/invites/:token", tokenParams, getInvite);
router.post(
  "/admin/invites/:token/accept",
  loginLimiter,
  validate({ params: inviteTokenParamsSchema, body: acceptInviteSchema }),
  acceptInvite
);

export default router;
