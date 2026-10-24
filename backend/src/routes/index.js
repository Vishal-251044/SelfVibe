/**
 * Combines every feature router under /api.
 */
import { Router } from "express";
import healthRoutes from "./health.routes.js";
import storageRoutes from "./storage.routes.js";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import listeningRoutes from "./listening.routes.js";
import libraryRoutes from "./library.routes.js";
import playlistRoutes from "./playlist.routes.js";
import commentRoutes from "./comment.routes.js";
import adminAuthRoutes from "./adminAuth.routes.js";
import adminMusicRoutes from "./adminMusic.routes.js";
import onboardingRoutes from "./onboarding.routes.js";
import uploadRoutes from "./upload.routes.js";
import trackRoutes from "./track.routes.js";
import creatorRoutes from "./creator.routes.js";
import artistRoutes from "./artist.routes.js";
import reportRoutes from "./report.routes.js";
import { requireDatabase } from "../middlewares/database.middleware.js";

const router = Router();

router.use("/health", healthRoutes);
// File uploads / playback from local storage don't need the database
router.use("/storage", storageRoutes);

// Everything below needs MongoDB: answer 503 right away if it is down
router.use(requireDatabase);

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/uploads", uploadRoutes);
router.use("/tracks", trackRoutes);
router.use("/creator", creatorRoutes);
router.use("/artists", artistRoutes);
router.use("/reports", reportRoutes);
router.use(listeningRoutes); // /events, /history
router.use(libraryRoutes); // /likes, /follow, /follows
router.use("/playlists", playlistRoutes);
router.use("/comments", commentRoutes);
router.use("/admin/auth", adminAuthRoutes);
router.use("/admin", adminMusicRoutes);

export default router;
