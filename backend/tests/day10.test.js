/**
 * Unit tests for Day 10: device names for security emails, the Redis
 * rate-limit store (with an in-memory stand-in for Redis), lockout error,
 * error-event scrubbing inputs, and the new validators (shares, account
 * deletion, artist page ids).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeUserAgent } from "../src/helpers/genericFunctions.js";
import { RedisRateLimitStore } from "../src/utils/rateLimitStore.js";
import { assertNotLocked } from "../src/services/staffSecurity.service.js";
import { shareSchema } from "../src/validators/share.validator.js";
import { deleteAccountSchema } from "../src/validators/user.validator.js";
import { artistPageParamsSchema } from "../src/validators/artist.validator.js";
import { hasPermission } from "../src/config/permissions.js";
import { productionProblems } from "../src/config/env.js";
import { ERROR_CODES, STAFF_LOCKOUT } from "../src/config/constants.js";

/**
 * Tiny stand-in for the ioredis client: just the commands the store uses,
 * with the Lua script's behaviour (INCR + PEXPIRE on first hit + PTTL).
 */
function fakeRedis() {
  const keys = new Map(); // key → { value, expiresAt }
  const live = (key) => {
    const entry = keys.get(key);
    if (entry && entry.expiresAt <= Date.now()) keys.delete(key);
    return keys.get(key);
  };
  return {
    keys,
    async eval(script, count, key, windowMs) {
      const entry = live(key) ?? { value: 0, expiresAt: Date.now() + Number(windowMs) };
      entry.value += 1;
      keys.set(key, entry);
      return [entry.value, entry.expiresAt - Date.now()];
    },
    async get(key) {
      const entry = live(key);
      return entry ? String(entry.value) : null;
    },
    async pttl(key) {
      const entry = live(key);
      return entry ? entry.expiresAt - Date.now() : -2;
    },
    async decr(key) {
      const entry = live(key);
      if (entry) entry.value -= 1;
    },
    async del(key) {
      keys.delete(key);
    },
  };
}

describe("describeUserAgent", () => {
  const cases = [
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Chrome on Android",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      "Safari on iOS",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0",
      "Edge on Windows",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
      "Firefox on macOS",
    ],
    ["", "Unknown browser on unknown system"],
  ];
  for (const [ua, expected] of cases) {
    it(`reads "${expected}"`, () => assert.equal(describeUserAgent(ua), expected));
  }
});

describe("RedisRateLimitStore", () => {
  it("counts hits per key and limiter, and resets", async () => {
    const redis = fakeRedis();
    const login = new RedisRateLimitStore("login", redis);
    const share = new RedisRateLimitStore("share", redis);
    login.init({ windowMs: 60_000 });
    share.init({ windowMs: 60_000 });

    assert.equal((await login.increment("1.2.3.4|a@b.c")).totalHits, 1);
    const second = await login.increment("1.2.3.4|a@b.c");
    assert.equal(second.totalHits, 2);
    assert.ok(second.resetTime > new Date());
    // Another limiter with the same key has its own counter
    assert.equal((await share.increment("1.2.3.4|a@b.c")).totalHits, 1);

    await login.decrement("1.2.3.4|a@b.c");
    assert.equal((await login.get("1.2.3.4|a@b.c")).totalHits, 1);
    await login.resetKey("1.2.3.4|a@b.c");
    assert.equal(await login.get("1.2.3.4|a@b.c"), undefined);
    assert.equal(login.localKeys, false);
  });

  it("starts a new window after the old one ends", async () => {
    const redis = fakeRedis();
    const store = new RedisRateLimitStore("x", redis);
    store.init({ windowMs: 20 });
    await store.increment("k");
    await store.increment("k");
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal((await store.increment("k")).totalHits, 1);
  });
});

describe("staff lockout", () => {
  it("lets an unlocked or expired account through", () => {
    assert.doesNotThrow(() => assertNotLocked({ lockedUntil: null }));
    assert.doesNotThrow(() => assertNotLocked({ lockedUntil: new Date(Date.now() - 1000) }));
  });

  it("refuses a locked account with 423 and the minutes left", () => {
    try {
      assertNotLocked({ lockedUntil: new Date(Date.now() + 10 * 60_000 - 500) });
      assert.fail("should have thrown");
    } catch (error) {
      assert.equal(error.statusCode, 423);
      assert.equal(error.details.code, ERROR_CODES.ACCOUNT_LOCKED);
      assert.match(error.message, /10 minutes/);
    }
  });

  it("locks after more failures than the 5-per-15-min rate limit", () => {
    assert.ok(STAFF_LOCKOUT.maxFailures > 5);
    assert.equal(STAFF_LOCKOUT.lockMs, 30 * 60 * 1000);
  });

  it("only the Owner can unlock, reset 2FA or sign out team members", () => {
    for (const role of ["admin", "contentManager", "moderator"]) {
      assert.equal(hasPermission(role, "team.manage"), false);
    }
    assert.equal(hasPermission("owner", "team.manage"), true);
  });
});

describe("Day 10 validators", () => {
  it("accepts a share and defaults the channel", () => {
    const result = shareSchema.parse({ targetType: "track", targetId: "a".repeat(24) });
    assert.equal(result.channel, "native");
  });

  it("rejects unknown share targets and bad ids", () => {
    assert.equal(
      shareSchema.safeParse({ targetType: "user", targetId: "a".repeat(24) }).success,
      false
    );
    assert.equal(shareSchema.safeParse({ targetType: "track", targetId: "nope" }).success, false);
  });

  it("account deletion takes a password or the confirm word, both optional in the schema", () => {
    assert.equal(deleteAccountSchema.safeParse({ password: "x" }).success, true);
    assert.equal(deleteAccountSchema.safeParse({ confirm: "DELETE" }).success, true);
    assert.equal(deleteAccountSchema.safeParse({ confirm: "x".repeat(21) }).success, false);
  });

  it("artist pages accept ids and slugs, nothing else", () => {
    assert.equal(artistPageParamsSchema.safeParse({ idOrSlug: "arijit-singh" }).success, true);
    assert.equal(artistPageParamsSchema.safeParse({ idOrSlug: "f".repeat(24) }).success, true);
    assert.equal(artistPageParamsSchema.safeParse({ idOrSlug: "../etc" }).success, false);
    assert.equal(artistPageParamsSchema.safeParse({ idOrSlug: "a b" }).success, false);
  });
});

describe("production launch checks", () => {
  it("are skipped outside production", () => {
    assert.deepEqual(productionProblems(), []);
  });
});
