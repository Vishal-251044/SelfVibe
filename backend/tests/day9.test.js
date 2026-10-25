/**
 * Unit tests for Day 9: time-zone days, stats summaries, item-to-item
 * similarity, Daily Mix seeding, CSV export, the staff permission matrix
 * (Moderator gets 403 on Music, Settings and Team) and console validators.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  lastZonedDays,
  msUntilDailyRun,
  startOfZonedDay,
  zonedDateString,
} from "../src/utils/dates.js";
import { summariseStats } from "../src/services/stats/trackStats.service.js";
import {
  contentSimilarity,
  cooccurrenceSimilarities,
} from "../src/services/recommendation/similarity.service.js";
import { seededShuffle, topClusters } from "../src/services/recommendation/dailyMix.service.js";
import { toCsv } from "../src/helpers/genericFunctions.js";
import { hasPermission } from "../src/config/permissions.js";
import {
  createHomeSectionSchema,
  inviteSchema,
  moderateSchema,
  performanceQuerySchema,
  settingsSchema,
} from "../src/validators/adminPlatform.validator.js";

const TZ = "Asia/Kolkata";

describe("calendar days in India time", () => {
  it("21:00 UTC is already the next day in India", () => {
    assert.equal(zonedDateString(new Date("2026-10-29T21:00:00Z"), TZ), "2026-10-30");
    assert.equal(zonedDateString(new Date("2026-10-29T10:00:00Z"), TZ), "2026-10-29");
  });
  it("a day starts at 18:30 UTC the evening before", () => {
    assert.equal(startOfZonedDay("2026-10-30", TZ).toISOString(), "2026-10-29T18:30:00.000Z");
  });
  it("lists the last N days, oldest first", () => {
    assert.deepEqual(lastZonedDays(3, TZ, new Date("2026-11-01T06:00:00Z")), [
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });
  it("waits until the next 03:00 India time", () => {
    const now = new Date("2026-10-29T20:00:00Z"); // 01:30 IST on the 30th
    assert.equal(msUntilDailyRun("0 3 * * *", TZ, now), 90 * 60 * 1000);
    const after = new Date("2026-10-29T22:00:00Z"); // 03:30 IST → tomorrow
    assert.equal(msUntilDailyRun("0 3 * * *", TZ, after), 23.5 * 60 * 60 * 1000);
  });
});

describe("song performance summaries (PRD 10.15.2)", () => {
  it("adds days up and works out rates", () => {
    const stats = summariseStats([
      {
        plays: 8,
        uniqueListeners: 5,
        completes: 4,
        skips: 2,
        likes: 1,
        listenPctSum: 400,
        listenPctCount: 6,
      },
      {
        plays: 2,
        uniqueListeners: 2,
        completes: 1,
        skips: 1,
        saves: 3,
        comments: 2,
        listenPctSum: 100,
        listenPctCount: 2,
      },
    ]);
    assert.equal(stats.plays, 10);
    assert.equal(stats.listeners, 7);
    assert.equal(stats.completionRate, 0.5);
    assert.equal(stats.skipRate, 0.3);
    assert.equal(stats.avgListenPct, 62.5);
    assert.equal(stats.saves, 3);
    assert.equal(stats.comments, 2);
  });
  it("no plays → rates are empty, not 0", () => {
    const stats = summariseStats([]);
    assert.equal(stats.completionRate, null);
    assert.equal(stats.avgListenPct, null);
  });
});

describe("listeners who liked X also liked Y (PRD 10.4.2 v2)", () => {
  const users = new Map([
    ["u1", new Set(["a", "b", "c"])],
    ["u2", new Set(["a", "b"])],
    ["u3", new Set(["a", "b", "d"])],
    ["u4", new Set(["c", "d"])],
  ]);
  const neighbours = cooccurrenceSimilarities(users);
  it("songs liked together are the closest", () => {
    assert.equal(neighbours.get("a")[0].trackId, "b");
    assert.equal(neighbours.get("b")[0].trackId, "a");
  });
  it("is symmetric and bounded", () => {
    const ab = neighbours.get("a").find((entry) => entry.trackId === "b").score;
    const ba = neighbours.get("b").find((entry) => entry.trackId === "a").score;
    assert.equal(ab, ba);
    assert.ok(ab > 0 && ab <= 1);
  });
  it("one shared fan counts less than three", () => {
    const ac = neighbours.get("a").find((entry) => entry.trackId === "c").score;
    const ab = neighbours.get("a").find((entry) => entry.trackId === "b").score;
    assert.ok(ac < ab);
  });
  it("keeps the top K", () => {
    assert.ok(cooccurrenceSimilarities(users, { topK: 1 }).get("a").length === 1);
  });
  it("content fallback: shared genres and vibes", () => {
    const seed = { id: "s", artistId: "x", genres: ["lo-fi"], vibes: ["chill"], mood: "calm" };
    const close = { id: "c", artistId: "y", genres: ["lo-fi"], vibes: ["chill"], mood: "calm" };
    const far = { id: "f", artistId: "z", genres: ["rock"], vibes: ["gym"] };
    assert.ok(contentSimilarity(seed, close) > contentSimilarity(seed, far));
    assert.equal(contentSimilarity(seed, seed), 0);
  });
});

describe("Daily Mix", () => {
  it("the same seed gives the same order; another day reshuffles", () => {
    const items = Array.from({ length: 20 }, (_, index) => index);
    assert.deepEqual(
      seededShuffle(items, "u1|2026-10-30|genre:lo-fi"),
      seededShuffle(items, "u1|2026-10-30|genre:lo-fi")
    );
    assert.notDeepEqual(
      seededShuffle(items, "u1|2026-10-30|genre:lo-fi"),
      seededShuffle(items, "u1|2026-10-31|genre:lo-fi")
    );
    assert.deepEqual(
      [...seededShuffle(items, "x")].sort((a, b) => a - b),
      items
    );
  });
  it("mixes follow the top genres, then vibes", () => {
    const clusters = topClusters(
      { genre: { "lo-fi": 1, rock: 0.4, pop: -0.5 }, vibe: { chill: 0.9 } },
      3
    );
    assert.deepEqual(clusters, [
      { kind: "genre", slug: "lo-fi" },
      { kind: "genre", slug: "rock" },
      { kind: "vibe", slug: "chill" },
    ]);
  });
});

describe("CSV export (PRF-3)", () => {
  it("quotes commas / quotes and defuses spreadsheet formulas", () => {
    const csv = toCsv(
      [
        { title: 'Tum "Hi" Ho, live', plays: 3 },
        { title: "=HYPERLINK(1)", plays: 0 },
      ],
      [
        { key: "title", label: "Title" },
        { key: "plays", label: "Plays" },
      ]
    );
    assert.equal(csv, 'Title,Plays\r\n"Tum ""Hi"" Ho, live",3\r\n\'=HYPERLINK(1),0');
  });
});

describe("permission matrix (PRD §8.2)", () => {
  it("Moderator: no Music, Settings or Team; yes moderation", () => {
    assert.equal(hasPermission("moderator", "music.manage"), false);
    assert.equal(hasPermission("moderator", "catalog.edit"), false);
    assert.equal(hasPermission("moderator", "settings.manage"), false);
    assert.equal(hasPermission("moderator", "team.manage"), false);
    assert.equal(hasPermission("moderator", "reports.manage"), true);
    assert.equal(hasPermission("moderator", "dashboard.view"), true);
  });
  it("Content Manager curates but can't manage users; Admin can't touch settings or team", () => {
    assert.equal(hasPermission("contentManager", "curation.manage"), true);
    assert.equal(hasPermission("contentManager", "users.manage"), false);
    assert.equal(hasPermission("admin", "users.manage"), true);
    assert.equal(hasPermission("admin", "storage.manage"), true);
    assert.equal(hasPermission("admin", "settings.manage"), false);
    assert.equal(hasPermission("admin", "team.manage"), false);
    assert.equal(hasPermission("owner", "team.manage"), true);
  });
});

describe("console validators", () => {
  it("performance ranges and filters", () => {
    assert.equal(performanceQuerySchema.parse({}).range, 30);
    assert.equal(performanceQuerySchema.parse({ range: "0", catalog: "ai" }).range, 0);
    assert.equal(performanceQuerySchema.safeParse({ range: "45" }).success, false);
  });
  it("only invitable roles (never Owner)", () => {
    assert.equal(inviteSchema.safeParse({ email: "a@b.co", staffRole: "moderator" }).success, true);
    assert.equal(inviteSchema.safeParse({ email: "a@b.co", staffRole: "owner" }).success, false);
  });
  it("moderation actions and settings", () => {
    assert.equal(
      moderateSchema.safeParse({
        targetType: "track",
        targetId: "0123456789abcdef01234567",
        action: "takeDown",
      }).success,
      true
    );
    assert.equal(
      moderateSchema.safeParse({
        targetType: "track",
        targetId: "0123456789abcdef01234567",
        action: "ban",
      }).success,
      false
    );
    assert.equal(settingsSchema.safeParse({ features: { voice: false } }).success, true);
    assert.equal(settingsSchema.safeParse({ adminIpAllowlist: ["not an ip!"] }).success, false);
    assert.equal(settingsSchema.safeParse({ secret: 1 }).success, false);
  });
  it("home sections: https images, app links, date order", () => {
    const base = { type: "hero", title: "Monsoon picks" };
    assert.equal(
      createHomeSectionSchema.safeParse({
        ...base,
        imageUrl: "https://img.test/a.jpg",
        link: "/browse/vibe/chill",
      }).success,
      true
    );
    assert.equal(
      createHomeSectionSchema.safeParse({ ...base, imageUrl: "http://img.test/a.jpg" }).success,
      false
    );
    assert.equal(
      createHomeSectionSchema.safeParse({ ...base, link: "javascript:alert(1)" }).success,
      false
    );
    assert.equal(
      createHomeSectionSchema.safeParse({ ...base, startsAt: "2026-11-02", endsAt: "2026-11-01" })
        .success,
      false
    );
  });
});
