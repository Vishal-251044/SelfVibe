/**
 * Unit tests for the token service: access tokens, staff tokens, 2FA
 * challenge tokens and refresh token generation.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  generateRefreshToken,
  signAccessToken,
  signStaffAccessToken,
  signStaffChallengeToken,
  verifyAccessToken,
  verifyStaffAccessToken,
  verifyStaffChallengeToken,
} from "../src/services/token.service.js";
import { hashToken } from "../src/utils/crypto.js";
import { ERROR_CODES, TOKEN_AUDIENCE, TOKEN_ISSUER } from "../src/config/constants.js";

const user = { _id: "64b000000000000000000001", roles: ["listener", "creator"] };
const staff = { _id: "64b000000000000000000002", staffRole: "moderator" };
const SESSION_ID = "64b0000000000000000000aa";

/**
 * Assert that fn throws an ApiError with the given status and code.
 * @param {Function} fn
 * @param {number} statusCode
 * @param {string} code
 */
function assertApiError(fn, statusCode, code) {
  assert.throws(fn, (error) => {
    assert.equal(error.name, "ApiError");
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.details?.code, code);
    return true;
  });
}

describe("user access tokens", () => {
  it("round-trips user id, session id and roles", () => {
    const claims = verifyAccessToken(signAccessToken(user, SESSION_ID));
    assert.equal(claims.sub, user._id);
    assert.equal(claims.sid, SESSION_ID);
    assert.deepEqual(claims.roles, user.roles);
    assert.equal(claims.aud, TOKEN_AUDIENCE.USER);
  });

  it("expires after 15 minutes", () => {
    const claims = verifyAccessToken(signAccessToken(user, SESSION_ID));
    assert.equal(claims.exp - claims.iat, 15 * 60);
  });

  it("rejects an expired token with TOKEN_EXPIRED", () => {
    const expired = jwt.sign({ sid: SESSION_ID, roles: [] }, process.env.JWT_SECRET, {
      subject: user._id,
      audience: TOKEN_AUDIENCE.USER,
      issuer: TOKEN_ISSUER,
      expiresIn: -10,
    });
    assertApiError(() => verifyAccessToken(expired), 401, ERROR_CODES.TOKEN_EXPIRED);
  });

  it("rejects a tampered token with TOKEN_INVALID", () => {
    const token = signAccessToken(user, SESSION_ID);
    const tampered = `${token.slice(0, -4)}AAAA`;
    assertApiError(() => verifyAccessToken(tampered), 401, ERROR_CODES.TOKEN_INVALID);
  });

  it("rejects a token signed with another secret", () => {
    const forged = jwt.sign({ sid: SESSION_ID }, "some-other-secret-that-is-long-enough", {
      subject: user._id,
      audience: TOKEN_AUDIENCE.USER,
      issuer: TOKEN_ISSUER,
    });
    assertApiError(() => verifyAccessToken(forged), 401, ERROR_CODES.TOKEN_INVALID);
  });

  it("rejects the 'none' algorithm", () => {
    const unsigned = jwt.sign({ sid: SESSION_ID }, null, {
      algorithm: "none",
      subject: user._id,
      audience: TOKEN_AUDIENCE.USER,
      issuer: TOKEN_ISSUER,
    });
    assertApiError(() => verifyAccessToken(unsigned), 401, ERROR_CODES.TOKEN_INVALID);
  });
});

describe("staff access tokens", () => {
  it("round-trips the staff role", () => {
    const claims = verifyStaffAccessToken(signStaffAccessToken(staff, SESSION_ID));
    assert.equal(claims.sub, staff._id);
    assert.equal(claims.staffRole, "moderator");
    assert.equal(claims.aud, TOKEN_AUDIENCE.STAFF);
  });

  it("a listener token is never accepted as a staff token", () => {
    const listenerToken = signAccessToken(user, SESSION_ID);
    assertApiError(() => verifyStaffAccessToken(listenerToken), 401, ERROR_CODES.TOKEN_INVALID);
  });

  it("a staff token is never accepted as a listener token", () => {
    const staffToken = signStaffAccessToken(staff, SESSION_ID);
    assertApiError(() => verifyAccessToken(staffToken), 401, ERROR_CODES.TOKEN_INVALID);
  });

  it("a 2FA challenge token cannot be used as a staff access token", () => {
    const challenge = signStaffChallengeToken(staff, "verify");
    assertApiError(() => verifyStaffAccessToken(challenge), 401, ERROR_CODES.TOKEN_INVALID);
  });
});

describe("2FA challenge tokens", () => {
  it("carry the purpose and last 5 minutes", () => {
    const claims = verifyStaffChallengeToken(signStaffChallengeToken(staff, "setup"));
    assert.equal(claims.purpose, "setup");
    assert.equal(claims.exp - claims.iat, 5 * 60);
  });

  it("a staff access token cannot be used as a challenge token", () => {
    const accessToken = signStaffAccessToken(staff, SESSION_ID);
    assert.throws(() => verifyStaffChallengeToken(accessToken), { statusCode: 401 });
  });
});

describe("refresh tokens", () => {
  it("are long, random and stored only as a SHA-256 hash", () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();
    assert.ok(first.token.length >= 64);
    assert.notEqual(first.token, second.token);
    assert.equal(first.tokenHash, hashToken(first.token));
    assert.notEqual(first.tokenHash, first.token);
    assert.match(first.tokenHash, /^[0-9a-f]{64}$/);
  });
});
