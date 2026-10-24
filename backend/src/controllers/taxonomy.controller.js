/**
 * Admin Genres & Vibes manager (roadmap Day 7): /api/admin/genres, /api/admin/vibes.
 * Every write is audit-logged.
 */
import * as taxonomyService from "../services/taxonomy.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const LABEL = { genre: "Genre", vibe: "Vibe" };
const PLURAL = { genre: "Genres", vibe: "Vibes" };

/**
 * GET /api/admin/<kind>s — every item, hidden ones too
 * @param {"genre"|"vibe"} kind
 * @returns {import("express").RequestHandler}
 */
export const list = (kind) =>
  asyncHandler(async (req, res) => {
    const items = await taxonomyService.listManagedCategories(kind);
    return sendSuccess(res, { message: `${PLURAL[kind]} fetched`, data: { items } });
  });

/**
 * POST /api/admin/<kind>s
 * @param {"genre"|"vibe"} kind
 * @returns {import("express").RequestHandler}
 */
export const create = (kind) =>
  asyncHandler(async (req, res) => {
    const item = await taxonomyService.createCategory(kind, req.body);
    req.audit?.({ action: `${kind}.create`, targetType: kind, targetId: item.id, after: item });
    return sendSuccess(res, { statusCode: 201, message: `${LABEL[kind]} added`, data: { item } });
  });

/**
 * PATCH /api/admin/<kind>s/:id
 * @param {"genre"|"vibe"} kind
 * @returns {import("express").RequestHandler}
 */
export const update = (kind) =>
  asyncHandler(async (req, res) => {
    const item = await taxonomyService.updateCategory(kind, req.validated.params.id, req.body);
    req.audit?.({ action: `${kind}.update`, targetType: kind, targetId: item.id, after: req.body });
    return sendSuccess(res, { message: `${LABEL[kind]} saved`, data: { item } });
  });

/**
 * PUT /api/admin/<kind>s/order
 * @param {"genre"|"vibe"} kind
 * @returns {import("express").RequestHandler}
 */
export const reorder = (kind) =>
  asyncHandler(async (req, res) => {
    const items = await taxonomyService.reorderCategories(kind, req.body.ids);
    req.audit?.({
      action: `${kind}.reorder`,
      targetType: kind,
      targetId: null,
      after: { ids: req.body.ids },
    });
    return sendSuccess(res, { message: "Order saved", data: { items } });
  });

/**
 * DELETE /api/admin/<kind>s/:id
 * @param {"genre"|"vibe"} kind
 * @returns {import("express").RequestHandler}
 */
export const remove = (kind) =>
  asyncHandler(async (req, res) => {
    await taxonomyService.deleteCategory(kind, req.validated.params.id);
    req.audit?.({ action: `${kind}.delete`, targetType: kind, targetId: req.validated.params.id });
    return sendSuccess(res, { message: `${LABEL[kind]} deleted`, data: null });
  });
