/**
 * Unit tests for the staff permission matrix (PRD §8.2) and the staff guard's
 * access check.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getPermissionsForRole,
  hasPermission,
  STAFF_PERMISSIONS,
} from "../src/config/permissions.js";
import { assertStaffAccess } from "../src/middlewares/staff.middleware.js";
import { ERROR_CODES } from "../src/config/constants.js";

// Expected matrix copied from PRD §8.2 (staff roles table)
const EXPECTED = {
  "console.access": { moderator: true, contentManager: true, admin: true, owner: true },
  "dashboard.view": { moderator: true, contentManager: true, admin: true, owner: true },
  "reports.manage": { moderator: true, contentManager: false, admin: true, owner: true },
  "music.manage": { moderator: false, contentManager: true, admin: true, owner: true },
  "catalog.edit": { moderator: false, contentManager: true, admin: true, owner: true },
  "curation.manage": { moderator: false, contentManager: true, admin: true, owner: true },
  "genres.manage": { moderator: false, contentManager: true, admin: true, owner: true },
  "users.manage": { moderator: false, contentManager: false, admin: true, owner: true },
  "ai.manage": { moderator: false, contentManager: false, admin: true, owner: true },
  "audit.view": { moderator: false, contentManager: false, admin: true, owner: true },
  "settings.manage": { moderator: false, contentManager: false, admin: false, owner: true },
  "team.manage": { moderator: false, contentManager: false, admin: false, owner: true },
};

describe("staff permission matrix", () => {
  it("covers exactly the permissions in the PRD table", () => {
    assert.deepEqual(Object.keys(STAFF_PERMISSIONS).sort(), Object.keys(EXPECTED).sort());
  });

  for (const [permission, roles] of Object.entries(EXPECTED)) {
    for (const [role, allowed] of Object.entries(roles)) {
      it(`${role} ${allowed ? "can" : "cannot"} ${permission}`, () => {
        assert.equal(hasPermission(role, permission), allowed);
      });
    }
  }

  it("owner has every permission", () => {
    assert.deepEqual(getPermissionsForRole("owner").sort(), Object.keys(EXPECTED).sort());
  });

  it("listeners (no staff role) and unknown roles have no permissions", () => {
    assert.equal(hasPermission(null, "console.access"), false);
    assert.equal(hasPermission(undefined, "dashboard.view"), false);
    assert.equal(hasPermission("listener", "dashboard.view"), false);
    assert.deepEqual(getPermissionsForRole("superuser"), []);
  });

  it("unknown permissions are denied", () => {
    assert.equal(hasPermission("owner", "does.not.exist"), false);
  });
});

describe("assertStaffAccess (requireStaff / requirePermission check)", () => {
  /** @param {Function} fn */
  const assertForbidden = (fn) =>
    assert.throws(fn, (error) => {
      assert.equal(error.statusCode, 403);
      assert.equal(error.details?.code, ERROR_CODES.FORBIDDEN);
      return true;
    });

  it("PRD acceptance: Moderator gets 403 on Music, Settings and Team", () => {
    assertForbidden(() => assertStaffAccess("moderator", { permission: "music.manage" }));
    assertForbidden(() => assertStaffAccess("moderator", { permission: "settings.manage" }));
    assertForbidden(() => assertStaffAccess("moderator", { permission: "team.manage" }));
  });

  it("Moderator can handle reports", () => {
    assert.doesNotThrow(() => assertStaffAccess("moderator", { permission: "reports.manage" }));
  });

  it("any staff role passes a plain requireStaff()", () => {
    for (const role of ["owner", "admin", "contentManager", "moderator"]) {
      assert.doesNotThrow(() => assertStaffAccess(role, {}));
    }
  });

  it("non-staff users are always rejected", () => {
    assertForbidden(() => assertStaffAccess(null, {}));
    assertForbidden(() => assertStaffAccess("listener", {}));
  });

  it("role-limited routes only allow the listed roles", () => {
    assert.doesNotThrow(() => assertStaffAccess("owner", { roles: ["owner"] }));
    assertForbidden(() => assertStaffAccess("admin", { roles: ["owner"] }));
  });
});
