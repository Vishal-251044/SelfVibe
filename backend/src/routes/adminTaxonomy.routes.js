/**
 * Admin Genres & Vibes routes (roadmap Day 7): /api/admin/genres, /api/admin/vibes.
 * Permission genres.manage (PRD §8.2); every write is audit-logged.
 */
import { Router } from "express";
import * as taxonomyController from "../controllers/taxonomy.controller.js";
import { requirePermission } from "../middlewares/staff.middleware.js";
import { auditStaffWrites } from "../middlewares/audit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  categoryIdParamsSchema,
  createCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from "../validators/taxonomy.validator.js";

const router = Router();
const canManage = [requirePermission("genres.manage"), auditStaffWrites];

for (const [path, kind] of [
  ["/genres", "genre"],
  ["/vibes", "vibe"],
]) {
  router.get(path, canManage, taxonomyController.list(kind));
  router.post(
    path,
    canManage,
    validate({ body: createCategorySchema }),
    taxonomyController.create(kind)
  );
  // Before /:id so "order" isn't read as an id
  router.put(
    `${path}/order`,
    canManage,
    validate({ body: reorderCategoriesSchema }),
    taxonomyController.reorder(kind)
  );
  router.patch(
    `${path}/:id`,
    canManage,
    validate({ params: categoryIdParamsSchema, body: updateCategorySchema }),
    taxonomyController.update(kind)
  );
  router.delete(
    `${path}/:id`,
    canManage,
    validate({ params: categoryIdParamsSchema }),
    taxonomyController.remove(kind)
  );
}

export default router;
