/**
 * Config loader: reads environment variables once (via dotenv), validates them,
 * and exports a frozen config object. The rest of the app imports `env` from
 * here and never reads process.env directly.
 */
import "dotenv/config";

const PLACEHOLDER_PATTERN = /^your_.*_here$/;

/**
 * Read an environment variable.
 * @param {string} key - Variable name
 * @param {string} [fallback] - Default when the variable is missing
 * @returns {string|undefined} The value (trimmed), or the fallback
 */
function read(key, fallback) {
  const value = process.env[key]?.trim();
  return value === undefined || value === "" ? fallback : value;
}

/**
 * Whether a value is missing or still the placeholder from .env.example.
 * @param {string|undefined} value
 * @returns {boolean}
 */
export function isUnset(value) {
  return !value || PLACEHOLDER_PATTERN.test(value);
}

const nodeEnv = read("NODE_ENV", "development");
const port = Number(read("PORT", "5000"));

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`[Config] PORT must be a positive integer, got "${process.env.PORT}"`);
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  isDevelopment: nodeEnv === "development",
  port,
  logLevel: read("LOG_LEVEL", nodeEnv === "production" ? "info" : "debug"),
  databaseUrl: read("DATABASE_URL"),
  // Comma-separated list of allowed browser origins for CORS
  clientUrls: (read("CLIENT_URL", "http://localhost:3000") ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
  jsonBodyLimit: read("JSON_BODY_LIMIT", "100kb"),
});
