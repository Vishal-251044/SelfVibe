/**
 * Storage routes: /api/storage (no database needed)
 */
import { Router } from "express";
import * as storageController from "../controllers/storage.controller.js";

const router = Router();

router.put("/local/upload", storageController.localUpload);
router.get("/local/file", storageController.localFile);
router.get("/public/*key", storageController.publicFile);

export default router;
