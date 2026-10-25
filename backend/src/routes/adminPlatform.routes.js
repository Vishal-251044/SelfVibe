/**
 * Owner Console platform routes (roadmap Day 9), mounted at /api/admin.
 * Each route names the permission it needs (PRD §8.2 matrix in
 * config/permissions.js); every write is audit-logged.
 *   /stats · /users · /verification-requests · /reports · /comments
 *   /tracks/performance · /storage/* · /home-sections · /editorial-playlists
 *   /settings (Owner) · /team (Owner) · /audit-logs
 */
import { Router } from "express";
import * as platform from "../controllers/adminPlatform.controller.js";
import * as insights from "../controllers/adminInsights.controller.js";
import * as curation from "../controllers/curation.controller.js";
import { requirePermission } from "../middlewares/staff.middleware.js";
import { auditStaffWrites } from "../middlewares/audit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  auditQuerySchema,
  commentActionSchema,
  commentReplySchema,
  createEditorialSchema,
  createHomeSectionSchema,
  creatorRoleSchema,
  idParamsSchema,
  inviteSchema,
  listCommentsQuerySchema,
  listReportsQuerySchema,
  listUsersQuerySchema,
  moderateSchema,
  performanceQuerySchema,
  reorderSchema,
  settingsSchema,
  staffRoleSchema,
  storageKeyParamsSchema,
  storageMoveSchema,
  storageStatusSchema,
  trackPerformanceQuerySchema,
  updateEditorialSchema,
  updateHomeSectionSchema,
  userStatusSchema,
  verifySchema,
} from "../validators/adminPlatform.validator.js";

const router = Router();
/** Permission + audit for a group of routes. */
const can = (permission) => [requirePermission(permission), auditStaffWrites];
const idParams = validate({ params: idParamsSchema });
const withId = (body) => validate({ params: idParamsSchema, body });

// Dashboard & song performance (every staff role can view)
router.get("/stats", can("dashboard.view"), platform.stats);
router.get(
  "/tracks/performance",
  can("dashboard.view"),
  validate({ query: performanceQuerySchema }),
  insights.listPerformance
);
router.get(
  "/tracks/performance/export",
  can("dashboard.view"),
  validate({ query: performanceQuerySchema }),
  insights.exportPerformance
);
router.get(
  "/tracks/:id/performance",
  can("dashboard.view"),
  validate({ params: idParamsSchema, query: trackPerformanceQuerySchema }),
  insights.trackPerformance
);
router.get(
  "/tracks/:id/performance/export",
  can("dashboard.view"),
  validate({ params: idParamsSchema, query: trackPerformanceQuerySchema }),
  insights.exportTrackPerformance
);

// Storage pool: view for all staff, change for Admin / Owner
router.get("/storage/accounts", can("dashboard.view"), insights.listStorage);
router.patch(
  "/storage/accounts/:key",
  can("storage.manage"),
  validate({ params: storageKeyParamsSchema, body: storageStatusSchema }),
  insights.setStorageStatus
);
router.post("/storage/sync", can("storage.manage"), insights.syncStorage);
router.post(
  "/storage/move",
  can("storage.manage"),
  validate({ body: storageMoveSchema }),
  insights.moveStorage
);

// Users & creators
router.get(
  "/users",
  can("users.manage"),
  validate({ query: listUsersQuerySchema }),
  platform.listUsers
);
router.get("/verification-requests", can("users.manage"), platform.listVerificationRequests);
router.get("/users/:id", can("users.manage"), idParams, platform.getUser);
router.patch(
  "/users/:id/status",
  can("users.manage"),
  withId(userStatusSchema),
  platform.setUserStatus
);
router.patch(
  "/users/:id/creator",
  can("users.manage"),
  withId(creatorRoleSchema),
  platform.setCreatorRole
);
router.patch("/users/:id/verify", can("users.manage"), withId(verifySchema), platform.setVerified);
router.post("/users/:id/password-reset", can("users.manage"), idParams, platform.sendPasswordReset);

// Moderation queue and comments
router.get(
  "/reports",
  can("reports.manage"),
  validate({ query: listReportsQuerySchema }),
  platform.listReports
);
router.post(
  "/reports/action",
  can("reports.manage"),
  validate({ body: moderateSchema }),
  platform.moderateReport
);
router.get(
  "/comments",
  can("reports.manage"),
  validate({ query: listCommentsQuerySchema }),
  platform.listComments
);
router.patch(
  "/comments/:id",
  can("reports.manage"),
  withId(commentActionSchema),
  platform.moderateComment
);
router.post(
  "/comments/:id/reply",
  can("reports.manage"),
  withId(commentReplySchema),
  platform.replyToComment
);

// Curation
router.get("/home-sections", can("curation.manage"), curation.listSections);
router.post(
  "/home-sections",
  can("curation.manage"),
  validate({ body: createHomeSectionSchema }),
  curation.createSection
);
router.put(
  "/home-sections/order",
  can("curation.manage"),
  validate({ body: reorderSchema }),
  curation.reorderSections
);
router.patch(
  "/home-sections/:id",
  can("curation.manage"),
  withId(updateHomeSectionSchema),
  curation.updateSection
);
router.delete("/home-sections/:id", can("curation.manage"), idParams, curation.deleteSection);
router.get("/editorial-playlists", can("curation.manage"), curation.listEditorial);
router.post(
  "/editorial-playlists",
  can("curation.manage"),
  validate({ body: createEditorialSchema }),
  curation.createEditorial
);
router.patch(
  "/editorial-playlists/:id",
  can("curation.manage"),
  withId(updateEditorialSchema),
  curation.updateEditorial
);
router.delete(
  "/editorial-playlists/:id",
  can("curation.manage"),
  idParams,
  curation.deleteEditorial
);

// Owner only
router.get("/settings", can("settings.manage"), platform.getAllSettings);
router.patch(
  "/settings",
  can("settings.manage"),
  validate({ body: settingsSchema }),
  platform.saveSettings
);
router.get("/team", can("team.manage"), platform.listTeam);
router.post(
  "/team/invites",
  can("team.manage"),
  validate({ body: inviteSchema }),
  platform.inviteStaff
);
router.delete("/team/invites/:id", can("team.manage"), idParams, platform.revokeInvite);
router.patch("/team/:id", can("team.manage"), withId(staffRoleSchema), platform.changeStaffRole);
router.delete("/team/:id", can("team.manage"), idParams, platform.removeStaff);

// Audit log (Admin / Owner)
router.get(
  "/audit-logs",
  can("audit.view"),
  validate({ query: auditQuerySchema }),
  platform.auditLogs
);

export default router;
