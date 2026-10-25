/**
 * Owner Console insights (roadmap Day 9): song performance (list, detail,
 * CSV exports) and the Cloudinary storage pool (accounts, pause / resume,
 * sync, move songs).
 */
import * as performanceService from "../services/admin/performance.service.js";
import * as storageService from "../services/admin/adminStorage.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";

const UTF8_BOM = String.fromCharCode(0xfeff);

/**
 * Send CSV as a download.
 * @param {import("express").Response} res
 * @param {string} filename
 * @param {string} csv
 * @returns {import("express").Response}
 */
function sendCsv(res, filename, csv) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  return res.send(UTF8_BOM + csv); // BOM so Excel reads UTF-8 (Hindi titles)
}

/* ===== Song performance ===== */

/** GET /api/admin/tracks/performance */
export const listPerformance = asyncHandler(async (req, res) => {
  const { range, ...query } = req.validated.query;
  const data = await performanceService.listPerformance({ rangeDays: range, ...query });
  return sendSuccess(res, { message: "Performance fetched", data });
});

/** GET /api/admin/tracks/performance/export */
export const exportPerformance = asyncHandler(async (req, res) => {
  const { range, catalog, q } = req.validated.query;
  const csv = await performanceService.exportCatalogCsv({ rangeDays: range, catalog, q });
  const label = range > 0 ? `${range}d` : "all-time";
  return sendCsv(res, `selfvibe-song-performance-${catalog}-${label}.csv`, csv);
});

/** GET /api/admin/tracks/:id/performance */
export const trackPerformance = asyncHandler(async (req, res) => {
  const data = await performanceService.getTrackPerformance(req.validated.params.id, {
    rangeDays: req.validated.query.range,
  });
  return sendSuccess(res, { message: "Song performance fetched", data });
});

/** GET /api/admin/tracks/:id/performance/export */
export const exportTrackPerformance = asyncHandler(async (req, res) => {
  const { filename, csv } = await performanceService.exportTrackCsv(req.validated.params.id, {
    rangeDays: req.validated.query.range,
  });
  return sendCsv(res, filename, csv);
});

/* ===== Storage ===== */

/** GET /api/admin/storage/accounts */
export const listStorage = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: "Storage fetched",
    data: await storageService.listStorageAccounts(),
  });
});

/** PATCH /api/admin/storage/accounts/:key */
export const setStorageStatus = asyncHandler(async (req, res) => {
  const { key } = req.validated.params;
  const { before, account } = await storageService.setAccountStatus(key, req.body.status);
  req.audit({
    action: req.body.status === "paused" ? "storage.pause" : "storage.resume",
    targetType: "storageAccount",
    targetId: key,
    before: { status: before },
    after: { status: account.status },
  });
  return sendSuccess(res, {
    message: req.body.status === "paused" ? "Account paused" : "Account resumed",
    data: { account },
  });
});

/** POST /api/admin/storage/sync */
export const syncStorage = asyncHandler(async (req, res) => {
  const data = await storageService.syncNow();
  req.audit({ action: "storage.sync", targetType: "storageAccount", targetId: "all" });
  return sendSuccess(res, { message: "Usage synced from Cloudinary", data });
});

/** POST /api/admin/storage/move */
export const moveStorage = asyncHandler(async (req, res) => {
  const result = await storageService.queueMove(req.body);
  req.audit({
    action: "storage.move",
    targetType: "storageAccount",
    targetId: `${req.body.fromKey}->${req.body.toKey}`,
    after: { queued: result.queued },
  });
  return sendSuccess(res, {
    statusCode: 202,
    message: `${result.queued} song(s) queued to move`,
    data: result,
  });
});
