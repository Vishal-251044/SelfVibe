/**
 * Config loader: reads environment variables once (via dotenv), validates them,
 * and exports a frozen config object. The rest of the app imports `env` from
 * here and never reads process.env directly.
 */
import "dotenv/config";
import { APP_VERSION, STORAGE_DEFAULT_QUOTA_GB, STORAGE_POOLS } from "./constants.js";

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
 * Read a positive integer environment variable.
 * @param {string} key - Variable name
 * @param {number} fallback - Default when missing
 * @returns {number}
 * @throws {Error} When the value is not a positive integer
 */
function readPositiveInt(key, fallback) {
  const value = Number(read(key, String(fallback)));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`[Config] ${key} must be a positive integer, got "${process.env[key]}"`);
  }
  return value;
}

/**
 * Read a boolean environment variable ("true" / "false").
 * @param {string} key - Variable name
 * @param {boolean} fallback - Default when missing
 * @returns {boolean}
 */
function readBoolean(key, fallback) {
  const value = read(key);
  return value === undefined ? fallback : value.toLowerCase() === "true";
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
const isProduction = nodeEnv === "production";

// Comma-separated list of allowed browser origins for CORS
const clientUrls = (read("CLIENT_URL", "http://localhost:3000") ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const google = {
  clientId: read("GOOGLE_CLIENT_ID"),
  clientSecret: read("GOOGLE_CLIENT_SECRET"),
  // Must point at the FRONTEND origin (/api is proxied) so the session cookie is first-party
  callbackUrl: read("GOOGLE_CALLBACK_URL", "http://localhost:3000/api/auth/google/callback"),
};

const cloudinary = {
  cloudName: read("CLOUDINARY_CLOUD_NAME"),
  apiKey: read("CLOUDINARY_API_KEY"),
  apiSecret: read("CLOUDINARY_API_SECRET"),
};

/**
 * Cloudinary storage pool (PRD 10.13, STO-2). Format, comma-separated:
 *   CLOUDINARY_ACCOUNTS=key|pool|cloudName|apiKey|apiSecret|quotaGb
 * pool = official | community | shared; quotaGb is optional (default 10).
 * Without the list, the single CLOUDINARY_* account (if set) becomes one
 * shared account, so a one-account setup needs no extra variables.
 * @returns {Array<{ key: string, pool: string, cloudName: string, apiKey: string, apiSecret: string, quotaBytes: number }>}
 * @throws {Error} When an entry is malformed (the message says which one)
 */
function readStorageAccounts() {
  const raw = read("CLOUDINARY_ACCOUNTS");
  if (isUnset(raw)) {
    const isSingleConfigured = [
      cloudinary.cloudName,
      cloudinary.apiKey,
      cloudinary.apiSecret,
    ].every((value) => !isUnset(value));
    if (!isSingleConfigured) return [];
    return [
      {
        key: "main",
        pool: "shared",
        cloudName: cloudinary.cloudName,
        apiKey: cloudinary.apiKey,
        apiSecret: cloudinary.apiSecret,
        quotaBytes: STORAGE_DEFAULT_QUOTA_GB * 1024 ** 3,
      },
    ];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const [key, pool, cloudName, apiKey, apiSecret, quotaGb] = entry
        .split("|")
        .map((part) => part.trim());
      const label = `[Config] CLOUDINARY_ACCOUNTS entry ${index + 1} ("${key ?? ""}")`;
      if (!/^[a-z0-9-]{1,32}$/.test(key ?? "")) {
        throw new Error(`${label}: the key must be 1-32 lowercase letters, numbers or dashes`);
      }
      if (!STORAGE_POOLS.includes(pool)) {
        throw new Error(`${label}: pool must be one of ${STORAGE_POOLS.join(", ")}`);
      }
      if ([cloudName, apiKey, apiSecret].some((value) => isUnset(value))) {
        throw new Error(`${label}: cloud name, API key and API secret are required`);
      }
      const quota = quotaGb ? Number(quotaGb) : STORAGE_DEFAULT_QUOTA_GB;
      if (!Number.isFinite(quota) || quota <= 0) {
        throw new Error(`${label}: quotaGb must be a positive number`);
      }
      return { key, pool, cloudName, apiKey, apiSecret, quotaBytes: Math.round(quota * 1024 ** 3) };
    });
}
const storageAccounts = readStorageAccounts();
if (new Set(storageAccounts.map((account) => account.key)).size !== storageAccounts.length) {
  throw new Error("[Config] CLOUDINARY_ACCOUNTS has the same key twice");
}

const email = {
  from: read("EMAIL_FROM", "SelfVibe <onboarding@resend.dev>"),
  resendApiKey: read("RESEND_API_KEY"),
};

const s3 = {
  endpoint: read("S3_ENDPOINT"), // R2: https://<account-id>.r2.cloudflarestorage.com
  region: read("S3_REGION", "auto"),
  bucket: read("S3_BUCKET"),
  accessKeyId: read("S3_ACCESS_KEY_ID"),
  secretAccessKey: read("S3_SECRET_ACCESS_KEY"),
  // Public (CDN) base URL for cover images, e.g. https://media.selfvibe.app
  publicBaseUrl: read("S3_PUBLIC_BASE_URL")?.replace(/\/$/, ""),
};
const s3IsConfigured = ["bucket", "accessKeyId", "secretAccessKey"].every(
  (key) => !isUnset(s3[key])
);
const redisUrl = read("REDIS_URL");
const sentryDsn = read("SENTRY_DSN");
const tracesSampleRate = Number(read("SENTRY_TRACES_SAMPLE_RATE", "0"));

export const env = Object.freeze({
  nodeEnv,
  isProduction,
  isDevelopment: nodeEnv === "development",
  isTest: nodeEnv === "test",
  port: readPositiveInt("PORT", 5000),
  logLevel: read("LOG_LEVEL", "info"),
  databaseUrl: read("DATABASE_URL"),
  clientUrls,
  // Public URL of the web app, used in emails and OAuth redirects
  appUrl: (read("APP_URL") ?? clientUrls[0] ?? "http://localhost:3000").replace(/\/$/, ""),
  jsonBodyLimit: read("JSON_BODY_LIMIT", "100kb"),
  // Number of reverse-proxy hops in front of the API (for req.ip and rate limiting)
  trustProxy: readPositiveInt("TRUST_PROXY", 1),

  auth: Object.freeze({
    // Listener / creator sessions (PRD AUTH-2)
    jwtSecret: read("JWT_SECRET"),
    accessTokenTtl: read("JWT_ACCESS_EXPIRES_IN", "15m"),
    refreshTokenTtlDays: readPositiveInt("REFRESH_TOKEN_EXPIRES_DAYS", 30),

    // Staff (Owner / Admin Console) sessions (PRD ADL-4)
    staffJwtSecret: read("STAFF_JWT_SECRET"),
    staffAccessTokenTtl: read("STAFF_JWT_ACCESS_EXPIRES_IN", "15m"),
    staffRefreshTokenTtlHours: readPositiveInt("STAFF_REFRESH_TOKEN_EXPIRES_HOURS", 8),
    staffIdleTimeoutMinutes: readPositiveInt("STAFF_IDLE_TIMEOUT_MINUTES", 30),

    // AES-256 key (64 hex chars) used to encrypt TOTP secrets at rest
    totpEncryptionKey: read("TOTP_ENCRYPTION_KEY"),
    totpIssuer: read("TOTP_ISSUER", "SelfVibe"),

    // Cookies must be Secure in production (HTTPS); localhost dev runs on plain HTTP
    cookieSecure: readBoolean("COOKIE_SECURE", isProduction),

    // Forgot-password links expire after 30 minutes (PRD AUTH-4)
    passwordResetTtlMinutes: readPositiveInt("PASSWORD_RESET_TTL_MINUTES", 30),
  }),

  // Google OAuth (PRD AUTH-3). Optional: "Continue with Google" is disabled until set.
  google: Object.freeze({
    ...google,
    isConfigured: !isUnset(google.clientId) && !isUnset(google.clientSecret),
  }),

  // Transactional email via Resend. Optional in development: emails are saved
  // to backend/.dev-emails/ instead of being sent.
  email: Object.freeze({ ...email, isConfigured: !isUnset(email.resendApiKey) }),

  // Cloudinary for avatars and cover images. Optional: uploads are disabled until set.
  cloudinary: Object.freeze({
    ...cloudinary,
    isConfigured:
      !isUnset(cloudinary.cloudName) &&
      !isUnset(cloudinary.apiKey) &&
      !isUnset(cloudinary.apiSecret),
  }),

  // Audio + cover storage (PRD 10.13). "cloudinary" = the Cloudinary storage pool (default when
  // accounts are set); "s3" = R2 / S3 (spare option); "local" = disk (development only)
  storage: Object.freeze({
    driver: read(
      "STORAGE_DRIVER",
      storageAccounts.length ? "cloudinary" : s3IsConfigured ? "s3" : "local"
    ),
    cloudinaryAccounts: Object.freeze(storageAccounts.map((account) => Object.freeze(account))),
    localDir: read("LOCAL_STORAGE_DIR", ".storage"),
    s3: Object.freeze({ ...s3, isConfigured: s3IsConfigured }),
    // Signed audio stream URLs stay valid this long (long enough for background queues, Day 5)
    streamUrlTtlSeconds: readPositiveInt("STREAM_URL_TTL_SECONDS", 4 * 60 * 60),
    uploadUrlTtlSeconds: readPositiveInt("UPLOAD_URL_TTL_SECONDS", 15 * 60),
  }),

  // Background jobs: BullMQ on Redis (Upstash) when REDIS_URL is set; in-process otherwise (dev only)
  queue: Object.freeze({
    redisUrl: isUnset(redisUrl) ? null : redisUrl,
    driver: isUnset(redisUrl) ? "memory" : "bullmq",
  }),

  // Royalty-free catalog import (npm run import:catalog)
  catalog: Object.freeze({
    jamendoClientId: isUnset(read("JAMENDO_CLIENT_ID")) ? null : read("JAMENDO_CLIENT_ID"),
  }),

  // Error tracking (roadmap Day 10). Optional: errors are only logged until SENTRY_DSN is set.
  sentry: Object.freeze({
    dsn: isUnset(sentryDsn) ? null : sentryDsn,
    release: read("SENTRY_RELEASE", `selfvibe-api@${APP_VERSION}`),
    // Share of requests traced for performance (0 = errors only, 0.1 = 10%)
    tracesSampleRate:
      Number.isFinite(tracesSampleRate) && tracesSampleRate >= 0 && tracesSampleRate <= 1
        ? tracesSampleRate
        : 0,
  }),

  // Used only by `npm run create-owner` (PRD ADL-3)
  owner: Object.freeze({
    email: read("OWNER_EMAIL"),
    password: read("OWNER_PASSWORD"),
    name: read("OWNER_NAME", "SelfVibe Owner"),
  }),
});

/**
 * Launch checks for NODE_ENV=production (roadmap Day 10): HTTPS URLs, secure
 * cookies and a real database. Mistakes here would silently break sign-in on
 * phones or leak cookies over HTTP, so the API refuses to start instead.
 * @returns {string[]} Problems found (empty outside production)
 */
export function productionProblems() {
  if (!env.isProduction) return [];
  const problems = [];
  if (isUnset(env.databaseUrl))
    problems.push("DATABASE_URL must be your MongoDB Atlas connection string");
  if (!env.appUrl.startsWith("https://")) {
    problems.push(
      `APP_URL must be the public https:// address of the web app (got "${env.appUrl}")`
    );
  }
  const localOrigins = env.clientUrls.filter((origin) => /localhost|127.0.0.1/.test(origin));
  if (env.clientUrls.length === 0 || localOrigins.length === env.clientUrls.length) {
    problems.push("CLIENT_URL must list the public https:// address of the web app");
  }
  if (!env.auth.cookieSecure)
    problems.push("COOKIE_SECURE must be true in production (HTTPS only)");
  if (isUnset(env.google.callbackUrl) || !env.google.callbackUrl.startsWith("https://")) {
    if (env.google.isConfigured) {
      problems.push(
        "GOOGLE_CALLBACK_URL must be the https:// address of the web app + /api/auth/google/callback"
      );
    }
  }
  return problems;
}

/**
 * Fail fast when secrets the API cannot run without are missing or weak.
 * Called from server.js at startup (scripts that do not need auth skip it).
 * @throws {Error} Listing every problem so they can all be fixed at once
 */
export function assertRequiredEnv() {
  const problems = [];
  const { jwtSecret, staffJwtSecret, totpEncryptionKey } = env.auth;

  if (isUnset(jwtSecret) || jwtSecret.length < 32) {
    problems.push("JWT_SECRET must be set to a random string of at least 32 characters");
  }
  if (isUnset(staffJwtSecret) || staffJwtSecret.length < 32) {
    problems.push("STAFF_JWT_SECRET must be set to a random string of at least 32 characters");
  } else if (staffJwtSecret === jwtSecret) {
    problems.push("STAFF_JWT_SECRET must be different from JWT_SECRET");
  }
  if (isUnset(totpEncryptionKey) || !/^[0-9a-f]{64}$/i.test(totpEncryptionKey)) {
    problems.push("TOTP_ENCRYPTION_KEY must be 64 hex characters (32 random bytes)");
  }

  if (env.isProduction && env.storage.driver === "local") {
    problems.push(
      "Production needs the Cloudinary storage pool: set CLOUDINARY_ACCOUNTS (or the CLOUDINARY_* account)"
    );
  }
  if (env.storage.driver === "cloudinary" && env.storage.cloudinaryAccounts.length === 0) {
    problems.push(
      "STORAGE_DRIVER=cloudinary needs CLOUDINARY_ACCOUNTS (or the CLOUDINARY_* account)"
    );
  }
  if (env.isProduction && env.queue.driver !== "bullmq") {
    problems.push("Production needs Redis for background jobs: set REDIS_URL (Upstash)");
  }
  problems.push(...productionProblems());

  if (problems.length > 0) {
    throw new Error(
      `[Config] Missing or invalid environment variables in backend/.env:\n  - ${problems.join("\n  - ")}\n` +
        `Generate a value with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
}
