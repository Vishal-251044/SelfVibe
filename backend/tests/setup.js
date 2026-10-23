/**
 * Test environment: loaded with `node --test --import ./tests/setup.js` before
 * any test file, so config/env.js sees these values instead of backend/.env.
 * The secrets below are test-only fixtures, never used outside the test run.
 */
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = "test-user-secret-0123456789-0123456789-abcdef";
process.env.STAFF_JWT_SECRET = "test-staff-secret-0123456789-0123456789-abcdef";
process.env.TOTP_ENCRYPTION_KEY = "0".repeat(63) + "1";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.STAFF_JWT_ACCESS_EXPIRES_IN = "15m";
process.env.APP_URL = "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
process.env.GOOGLE_CALLBACK_URL = "http://localhost:3000/api/auth/google/callback";
process.env.CLOUDINARY_CLOUD_NAME = "selfvibe-test";
process.env.CLOUDINARY_API_KEY = "123456789";
process.env.CLOUDINARY_API_SECRET = "test-cloudinary-secret";
// Unit tests use disk storage; Cloudinary pool logic is tested with its pure helpers
process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_STORAGE_DIR = ".storage-test";
