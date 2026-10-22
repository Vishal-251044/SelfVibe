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
