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

const email = {
  from: read("EMAIL_FROM", "SelfVibe <onboarding@resend.dev>"),
  resendApiKey: read("RESEND_API_KEY"),
};

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

  // Used only by `npm run create-owner` (PRD ADL-3)
  owner: Object.freeze({
    email: read("OWNER_EMAIL"),
    password: read("OWNER_PASSWORD"),
    name: read("OWNER_NAME", "SelfVibe Owner"),
  }),
});

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

  if (problems.length > 0) {
    throw new Error(
      `[Config] Missing or invalid environment variables in backend/.env:\n  - ${problems.join("\n  - ")}\n` +
        `Generate a value with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
}
