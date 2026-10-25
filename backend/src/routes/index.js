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
import searchRoutes from "./search.routes.js";
import browseRoutes from "./browse.routes.js";
import voiceRoutes from "./voice.routes.js";
import adminTaxonomyRoutes from "./adminTaxonomy.routes.js";
import feedRoutes from "./feed.routes.js";
import publicRoutes from "./public.routes.js";
import adminPlatformRoutes from "./adminPlatform.routes.js";
import { adminIpAllowlist, maintenanceGate } from "../middlewares/platform.middleware.js";
import { requireDatabase } from "../middlewares/database.middleware.js";

const router = Router();

router.use("/health", healthRoutes);
// File uploads / playback from local storage don't need the database
router.use("/storage", storageRoutes);

// Everything below needs MongoDB: answer 503 right away if it is down
router.use(requireDatabase);

// Public settings, Home curation and staff invite links (Day 9)
router.use(publicRoutes);
// Maintenance mode answers 503 for the listener app (console keeps working)
router.use(maintenanceGate);
// Optional admin IP allowlist (PRD ADL-6) for every console route
router.use("/admin", adminIpAllowlist);

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
router.use("/search", searchRoutes);
router.use(browseRoutes); // /browse/*, /trending, /new-releases
router.use("/voice", voiceRoutes);
router.use("/feed", feedRoutes);
router.use("/admin/auth", adminAuthRoutes);
// Before the music routes: /admin/tracks/performance must not be read as /admin/tracks/:id
router.use("/admin", adminPlatformRoutes); // stats, users, reports, comments, performance, storage, curation, settings, team, audit
router.use("/admin", adminMusicRoutes);
router.use("/admin", adminTaxonomyRoutes); // /admin/genres, /admin/vibes

export default router;
