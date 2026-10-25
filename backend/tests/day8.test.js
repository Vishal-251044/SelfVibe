/**
 * Unit tests for Day 8: recommendation scoring, feed diversity rules,
 * "Right now" vibe choice and listening signals → taste increments.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normaliseWeights,
  prepareTaste,
  rankTracks,
  scoreTrack,
} from "../src/services/recommendation/scoring.js";
import {
  interleave,
  pickDiverse,
  pickRightNowVibe,
  spreadArtists,
} from "../src/services/recommendation/feedRules.js";
import { listenIncrement } from "../src/services/taste.service.js";
import { LISTEN_TASTE_SIGNALS, RIGHT_NOW_VIBES } from "../src/config/constants.js";

const NOW = Date.parse("2026-10-29T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

/** A candidate track. */
const track = (id, overrides = {}) => ({
  id,
  artistId: `a-${id}`,
  genres: ["pop"],
  vibes: ["happy"],
  mood: null,
  energy: null,
  catalog: "official",
  playCount: 10,
  publishedAt: new Date(NOW - 100 * DAY),
  ...overrides,
});

const lofiFan = prepareTaste({
  genreWeights: { "lo-fi": 10, pop: -4 },
  vibeWeights: { chill: 8, gym: -2 },
  artistWeights: { "a-lata": 6 },
});
const bollywoodFan = prepareTaste({
  genreWeights: { bollywood: 10, "lo-fi": -2 },
  vibeWeights: { happy: 6 },
});

describe("taste vector", () => {
  it("scales each tag type to −1…1", () => {
    assert.deepEqual(normaliseWeights({ a: 10, b: -5, c: 0 }), { a: 1, b: -0.5, c: 0 });
    assert.deepEqual(normaliseWeights(new Map([["x", 4]])), { x: 1 });
    assert.deepEqual(normaliseWeights({}), {});
  });
  it("knows when there is no taste yet (cold start)", () => {
    assert.equal(prepareTaste(null).hasTaste, false);
    assert.equal(lofiFan.hasTaste, true);
  });
});

describe("scoring (PRD 10.4.2 v1)", () => {
  const lofi = track("lofi", { genres: ["lo-fi"], vibes: ["chill"] });
  const pop = track("pop", { genres: ["pop"], vibes: ["happy"] });
  const bolly = track("bolly", { genres: ["bollywood"], vibes: ["happy"] });

  it("liked tags score higher, disliked ones lower", () => {
    const context = { now: NOW, maxPlayCount: 10 };
    assert.ok(scoreTrack(lofi, lofiFan, context).score > scoreTrack(pop, lofiFan, context).score);
    assert.ok(
      scoreTrack(bolly, bollywoodFan, context).score > scoreTrack(lofi, bollywoodFan, context).score
    );
  });
  it("adds popularity and freshness", () => {
    const base = { now: NOW, maxPlayCount: 1000 };
    const popular = track("p", { playCount: 1000 });
    const quiet = track("q", { playCount: 1 });
    assert.ok(
      scoreTrack(popular, prepareTaste(null), base).score >
        scoreTrack(quiet, prepareTaste(null), base).score
    );
    const fresh = track("f", { publishedAt: new Date(NOW - DAY) });
    assert.ok(
      scoreTrack(fresh, prepareTaste(null), base).score >
        scoreTrack(track("o"), prepareTaste(null), base).score
    );
  });
  it("penalises songs heard in the last week", () => {
    const context = { now: NOW, maxPlayCount: 10 };
    const heard = scoreTrack(lofi, lofiFan, { ...context, recentlyPlayed: new Set(["lofi"]) });
    assert.ok(heard.score < scoreTrack(lofi, lofiFan, context).score);
  });
  it("explains itself ('Why this?')", () => {
    const context = { now: NOW, maxPlayCount: 10 };
    assert.deepEqual(scoreTrack(lofi, lofiFan, context).reason, { type: "genre", key: "lo-fi" });
    const byLata = track("x", { artistId: "a-lata", genres: ["jazz"], vibes: [] });
    assert.deepEqual(scoreTrack(byLata, lofiFan, context).reason, {
      type: "artist",
      key: "a-lata",
    });
    assert.equal(
      scoreTrack(
        track("n", { genres: ["jazz"], vibes: [], publishedAt: new Date(NOW) }),
        lofiFan,
        context
      ).reason.type,
      "new"
    );
  });
  it("liked tags count as familiar, unknown ones as discovery", () => {
    assert.equal(scoreTrack(lofi, lofiFan, { now: NOW }).familiar, true);
    assert.equal(scoreTrack(bolly, lofiFan, { now: NOW }).familiar, false);
  });
  it("marks known artists as familiar", () => {
    const context = { now: NOW, heardArtists: new Set(["a-pop"]) };
    assert.equal(scoreTrack(pop, lofiFan, context).familiar, true);
    assert.equal(scoreTrack(bolly, lofiFan, context).familiar, false);
  });
  it("two different tastes rank the same songs differently", () => {
    const songs = [lofi, pop, bolly, track("lofi2", { genres: ["lo-fi"], vibes: ["chill"] })];
    const forLofi = rankTracks(songs, lofiFan, { now: NOW }).map((item) => item.track.id);
    const forBolly = rankTracks(songs, bollywoodFan, { now: NOW }).map((item) => item.track.id);
    assert.ok(forLofi.slice(0, 2).every((id) => id.startsWith("lofi")));
    assert.equal(forBolly[0], "bolly");
  });
});

/** Ranked item helper. */
const item = (id, artistId, { familiar = true, catalog = "official", score = 1 } = {}) => ({
  track: { id, artistId, catalog },
  familiar,
  score,
});

describe("diversity rules", () => {
  it("max 2 songs per artist, never two in a row", () => {
    const ranked = [
      item("1", "A"),
      item("2", "A"),
      item("3", "A"),
      item("4", "A"),
      item("5", "B"),
      item("6", "B"),
      item("7", "C"),
    ];
    const picked = pickDiverse(ranked, { size: 5, familiarShare: null });
    const byArtist = picked.reduce(
      (counts, entry) => ({
        ...counts,
        [entry.track.artistId]: (counts[entry.track.artistId] ?? 0) + 1,
      }),
      {}
    );
    assert.ok(Object.values(byArtist).every((count) => count <= 2));
    for (let i = 1; i < picked.length; i += 1) {
      assert.notEqual(picked[i].track.artistId, picked[i - 1].track.artistId);
    }
  });
  it("mixes about 70% familiar and 30% discovery", () => {
    const ranked = [
      ...Array.from({ length: 20 }, (_, i) => item(`f${i}`, `F${i}`, { familiar: true })),
      ...Array.from({ length: 20 }, (_, i) => item(`d${i}`, `D${i}`, { familiar: false })),
    ];
    const picked = pickDiverse(ranked, { size: 10, familiarShare: 0.7 });
    assert.equal(picked.filter((entry) => entry.familiar).length, 7);
    assert.equal(picked.filter((entry) => !entry.familiar).length, 3);
    assert.equal(picked[2].familiar, false); // F F D …
  });
  it("fills from the other pool when one runs short", () => {
    const ranked = [
      item("f1", "X"),
      ...Array.from({ length: 9 }, (_, i) => item(`d${i}`, `D${i}`, { familiar: false })),
    ];
    assert.equal(pickDiverse(ranked, { size: 10, familiarShare: 0.7 }).length, 10);
  });
  it("keeps about 20% Community songs with All (CAT-4)", () => {
    const ranked = [
      ...Array.from({ length: 30 }, (_, i) => item(`o${i}`, `O${i}`)),
      ...Array.from({ length: 30 }, (_, i) =>
        item(`c${i}`, `C${i}`, { catalog: "community", score: 0 })
      ),
    ];
    const picked = pickDiverse(ranked, { size: 20, familiarShare: null, communityShare: 0.2 });
    assert.equal(picked.filter((entry) => entry.track.catalog === "community").length, 4);
  });
  it("interleave and spreadArtists keep every song", () => {
    const items = [item("1", "A"), item("2", "A", { familiar: false }), item("3", "B")];
    assert.equal(interleave(items, 0.7).length, 3);
    assert.deepEqual(
      spreadArtists([item("1", "A"), item("2", "A"), item("3", "B")]).map(
        (entry) => entry.track.id
      ),
      ["1", "3", "2"]
    );
  });
});

describe("Right now: <vibe>", () => {
  it("follows the time of day and the user's favourite vibe", () => {
    assert.equal(pickRightNowVibe(23, {}, RIGHT_NOW_VIBES).vibe, "chill");
    assert.equal(pickRightNowVibe(23, { sleep: 1, chill: 0.2 }, RIGHT_NOW_VIBES).vibe, "sleep");
    assert.equal(pickRightNowVibe(8, {}, RIGHT_NOW_VIBES).vibe, "focus");
    // Every fitting vibe, best first — the feed falls back down this list when a vibe has no songs
    assert.deepEqual(pickRightNowVibe(23, { sleep: 1 }, RIGHT_NOW_VIBES).options, [
      "sleep",
      "chill",
    ]);
    assert.equal(pickRightNowVibe(19, { party: 1 }, RIGHT_NOW_VIBES).vibe, "party");
    assert.equal(pickRightNowVibe(19, {}, RIGHT_NOW_VIBES, new Set(["travel"])).vibe, "travel");
  });
});

describe("listening signals → taste (PRD 10.4.1)", () => {
  it("merges a batch into one increment; skips lower the genre", () => {
    const tracks = new Map([
      ["t1", { genres: ["lo-fi"], vibes: ["chill"], mood: "calm", artistId: "A" }],
      ["t2", { genres: ["rock"], vibes: [], mood: null, artistId: "B" }],
    ]);
    const increment = listenIncrement(
      [
        { trackId: "t1", weight: LISTEN_TASTE_SIGNALS.complete },
        { trackId: "t1", weight: LISTEN_TASTE_SIGNALS.repeat },
        { trackId: "t2", weight: LISTEN_TASTE_SIGNALS.skip },
        { trackId: "missing", weight: 3 },
      ],
      tracks
    );
    assert.equal(increment["genreWeights.lo-fi"], 5);
    assert.equal(increment["vibeWeights.chill"], 5);
    assert.equal(increment["genreWeights.rock"], -2);
    assert.equal(increment["artistWeights.B"], -2);
  });
  it("drops tags that cancel out", () => {
    const tracks = new Map([["t", { genres: ["pop"], vibes: [], artistId: "A" }]]);
    const increment = listenIncrement(
      [
        { trackId: "t", weight: 2 },
        { trackId: "t", weight: -2 },
      ],
      tracks
    );
    assert.deepEqual(increment, {});
  });
});
