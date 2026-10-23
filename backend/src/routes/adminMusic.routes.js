/**
 * Admin music manager routes: /api/admin/uploads, /api/admin/tracks,
 * /api/admin/artists, /api/admin/albums.
 * Permissions (PRD §8.2): adding music = music.manage; editing the catalog = catalog.edit.
 * Every write is audit-logged.
 */
import { Router } from "express";
import * as adminTrack from "../controllers/adminTrack.controller.js";
import * as adminCatalog from "../controllers/adminCatalog.controller.js";
import { signStaffUpload } from "../controllers/upload.controller.js";
import { requirePermission } from "../middlewares/staff.middleware.js";
import { auditStaffWrites } from "../middlewares/audit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  adminCreateTrackSchema,
  adminUpdateTrackSchema,
  bulkUploadSchema,
  listTracksQuerySchema,
  reprocessSchema,
  scheduleSchema,
  signUploadSchema,
  streamQuerySchema,
  trackIdParamsSchema,
} from "../validators/track.validator.js";
import {
  adminCreateAlbumSchema,
  adminCreateArtistSchema,
  adminUpdateAlbumSchema,
  adminUpdateArtistSchema,
  albumTracksSchema,
  idParamsSchema,
  listArtistsQuerySchema,
} from "../validators/artist.validator.js";

const router = Router();
const canAddMusic = [requirePermission("music.manage"), auditStaffWrites];
const canEditCatalog = [requirePermission("catalog.edit"), auditStaffWrites];
const trackIdParams = validate({ params: trackIdParamsSchema });
const idParams = validate({ params: idParamsSchema });

/** validate() for :id params plus a body schema */
const withTrackBody = (body) => validate({ params: trackIdParamsSchema, body });
const withIdBody = (body) => validate({ params: idParamsSchema, body });

// Genres and vibes for the forms
router.get("/taxonomy", canEditCatalog, adminCatalog.getTaxonomy);

// Uploads
router.post("/uploads/sign", canEditCatalog, validate({ body: signUploadSchema }), signStaffUpload);

// Tracks
router.get(
  "/tracks",
  canEditCatalog,
  validate({ query: listTracksQuerySchema }),
  adminTrack.listTracks
);
router.post(
  "/tracks",
  canAddMusic,
  validate({ body: adminCreateTrackSchema }),
  adminTrack.createTrack
);
router.post(
  "/tracks/bulk",
  canAddMusic,
  validate({ body: bulkUploadSchema }),
  adminTrack.startBulkUpload
);
router.get("/tracks/bulk/:id", canAddMusic, idParams, adminTrack.getBulkUpload);
router.get("/tracks/:id", canEditCatalog, trackIdParams, adminTrack.getTrack);
router.patch(
  "/tracks/:id",
  canEditCatalog,
  withTrackBody(adminUpdateTrackSchema),
  adminTrack.updateTrack
);
router.delete("/tracks/:id", canEditCatalog, trackIdParams, adminTrack.deleteTrack);
router.post(
  "/tracks/:id/publish",
  canEditCatalog,
  trackIdParams,
  adminTrack.changeRelease("publish")
);
router.post(
  "/tracks/:id/unpublish",
  canEditCatalog,
  trackIdParams,
  adminTrack.changeRelease("unpublish")
);
router.post(
  "/tracks/:id/schedule",
  canEditCatalog,
  withTrackBody(scheduleSchema),
  adminTrack.changeRelease("schedule")
);
router.post(
  "/tracks/:id/reprocess",
  canAddMusic,
  withTrackBody(reprocessSchema),
  adminTrack.reprocessTrack
);
router.get(
  "/tracks/:id/stream",
  canEditCatalog,
  validate({ params: trackIdParamsSchema, query: streamQuerySchema }),
  adminTrack.previewStream
);

// Artists
router.get(
  "/artists",
  canEditCatalog,
  validate({ query: listArtistsQuerySchema }),
  adminCatalog.listArtists
);
router.post(
  "/artists",
  canEditCatalog,
  validate({ body: adminCreateArtistSchema }),
  adminCatalog.createArtist
);
router.get("/artists/:id", canEditCatalog, idParams, adminCatalog.getArtist);
router.patch(
  "/artists/:id",
  canEditCatalog,
  withIdBody(adminUpdateArtistSchema),
  adminCatalog.updateArtist
);
router.delete("/artists/:id", canEditCatalog, idParams, adminCatalog.deleteArtist);

// Albums
router.post(
  "/albums",
  canEditCatalog,
  validate({ body: adminCreateAlbumSchema }),
  adminCatalog.createAlbum
);
router.get("/albums/:id", canEditCatalog, idParams, adminCatalog.getAlbum);
router.patch(
  "/albums/:id",
  canEditCatalog,
  withIdBody(adminUpdateAlbumSchema),
  adminCatalog.updateAlbum
);
router.put(
  "/albums/:id/tracks",
  canEditCatalog,
  withIdBody(albumTracksSchema),
  adminCatalog.setAlbumTracks
);
router.delete("/albums/:id", canEditCatalog, idParams, adminCatalog.deleteAlbum);

export default router;
