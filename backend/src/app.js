/**
 * Express app setup: security headers, response compression, CORS, body parsing, request logging,
 * routes and the central error handler. Kept separate from server.js so the
 * app can be imported by tests without opening a port.
 */
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { requestLogger } from "./middlewares/requestLogger.middleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import apiRoutes from "./routes/index.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();

// Behind the Next.js /api proxy and Render / Railway: trust N hops for req.ip and HTTPS
app.set("trust proxy", env.trustProxy);
app.disable("x-powered-by");

app.use(helmet());

// gzip / brotli JSON: feeds, search and admin lists shrink ~70–85%, which
// matters most on slow mobile internet. Small replies and audio (already
// compressed) are sent as they are.
app.use(compression({ threshold: 1024 }));

// CORS whitelist: only the configured frontend origins may call the API with cookies
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, server-to-server) that send no Origin
      if (!origin || env.clientUrls.includes(origin)) return callback(null, true);
      return callback(ApiError.forbidden(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 600, // cache preflight responses for 10 minutes
  })
);

// Razorpay signs the exact bytes it sends, so its webhook gets the raw body (express.json then skips it)
app.use("/api/billing/webhook", express.raw({ type: "*/*", limit: "1mb" }));
app.use(express.json({ limit: env.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.jsonBodyLimit }));
app.use(cookieParser());
app.use(requestLogger);

app.use("/api", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
