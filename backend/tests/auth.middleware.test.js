/**
 * Unit tests for requireAuth / requireRole (stateless, no database needed).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requireAuth, requireRole } from "../src/middlewares/auth.middleware.js";
import { signAccessToken, signStaffAccessToken } from "../src/services/token.service.js";
import { ERROR_CODES } from "../src/config/constants.js";

/**
 * Run a middleware with a fake request and capture what it passes to next().
 * @param {Function} middleware
 * @param {Object} req
 * @returns {{ error: any, req: Object }}
 */
function run(middleware, req) {
  let error;
  middleware(req, {}, (value) => {
    error = value;
  });
  return { error, req };
}

const user = { _id: "64b000000000000000000001", roles: ["listener"] };

describe("requireAuth", () => {
  it("accepts a valid bearer token and sets req.auth", () => {
    const token = signAccessToken(user, "sess1");
    const { error, req } = run(requireAuth, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(error, undefined);
    assert.deepEqual(req.auth, { userId: user._id, sessionId: "sess1", roles: ["listener"] });
  });

  it("rejects a missing token with 401 AUTH_REQUIRED", () => {
    const { error } = run(requireAuth, { headers: {} });
    assert.equal(error.statusCode, 401);
    assert.equal(error.details.code, ERROR_CODES.AUTH_REQUIRED);
  });

  it("rejects a non-bearer scheme", () => {
    const { error } = run(requireAuth, { headers: { authorization: "Basic abc" } });
    assert.equal(error.statusCode, 401);
  });

  it("rejects a staff token on listener routes", () => {
    const staffToken = signStaffAccessToken({ _id: user._id, staffRole: "owner" }, "s");
    const { error } = run(requireAuth, { headers: { authorization: `Bearer ${staffToken}` } });
    assert.equal(error.statusCode, 401);
    assert.equal(error.details.code, ERROR_CODES.TOKEN_INVALID);
  });
});

describe("requireRole", () => {
  it("allows a user who has one of the roles", () => {
    const { error } = run(requireRole("listener", "creator"), { auth: { roles: ["listener"] } });
    assert.equal(error, undefined);
  });

  it("returns 403 when the role is missing", () => {
    const { error } = run(requireRole("creator"), { auth: { roles: ["listener"] } });
    assert.equal(error.statusCode, 403);
    assert.equal(error.details.code, ERROR_CODES.FORBIDDEN);
  });
});
