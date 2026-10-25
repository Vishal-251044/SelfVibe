/**
 * Central logger (pino). Use this instead of console.log.
 * - Development: pretty, coloured output
 * - Production: structured JSON (one line per log) for log aggregators
 * Sensitive fields are redacted so passwords and tokens never reach the logs.
 */
import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.logLevel,
  base: { service: "selfvibe-api" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.refreshToken",
    ],
    censor: "[redacted]",
  },
  // Pretty output only for local development (no worker thread in tests / production)
  ...(env.isProduction || env.isTest
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            // Request fields are already in the message line; production keeps them as JSON
            ignore: "pid,hostname,service,reqId,method,path,status,durationMs,userId",
          },
        },
      }),
});
