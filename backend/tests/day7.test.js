/**
 * Unit tests for Day 7: typo-tolerant matching and Hindi transliteration,
 * "song by artist" splitting, and the search / taxonomy / voice validators.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  editDistance,
  hasDevanagari,
  matchScore,
  normaliseText,
  prepareText,
  transliterate,
} from "../src/utils/textMatch.js";
import { splitSongAndArtist } from "../src/services/search.service.js";
import { publishedFilter } from "../src/services/browse.service.js";
import {
  browsePageQuerySchema,
  searchQuerySchema,
  voiceLogSchema,
} from "../src/validators/search.validator.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../src/validators/taxonomy.validator.js";
import { updateProfileSchema } from "../src/validators/user.validator.js";

/** Score a query against a title. */
const score = (query, title) => matchScore(prepareText(query), prepareText(title));

describe("Hindi transliteration (roadmap Day 7)", () => {
  it("turns Devanagari into the Latin spelling titles use", () => {
    assert.equal(transliterate("तुम ही हो"), "tum hee ho");
    assert.equal(normaliseText("केसरिया"), "kesariyaa");
    assert.equal(transliterate("Tum Hi Ho"), "Tum Hi Ho");
  });
  it("detects Devanagari", () => {
    assert.equal(hasDevanagari("अगला गाना"), true);
    assert.equal(hasDevanagari("agla gaana"), false);
  });
  it("gives Hindi and Hinglish spellings the same key", () => {
    assert.equal(prepareText("अगला गाना").key, prepareText("agla gaana").key);
    assert.equal(prepareText("zindagi").key, prepareText("jindagi").key);
    assert.equal(prepareText("phir").key, prepareText("fir").key);
  });
});

describe("typo-tolerant matching (PRD SRC-2)", () => {
  it("matches exact, partial, misspelt and Devanagari queries", () => {
    assert.equal(score("Tum Hi Ho", "Tum Hi Ho"), 1);
    assert.equal(score("तुम ही हो", "Tum Hi Ho"), 1);
    assert.equal(score("केसरिया", "Kesariya"), 1);
    assert.ok(score("tum hi", "Tum Hi Ho") > 0.9);
    assert.ok(score("tm hi ho", "Tum Hi Ho") > 0.8);
    assert.ok(score("arjit sing", "Arijit Singh") > 0.85);
  });
  it("keeps unrelated titles low", () => {
    assert.ok(score("monsoon", "Midnight Drive") < 0.3);
    assert.ok(score("lo fi", "Chai at 2AM") < 0.4);
  });
  it("counts edits and stops early", () => {
    assert.equal(editDistance("kitten", "sitting"), 3);
    assert.ok(editDistance("abcdef", "uvwxyz", 2) > 2);
  });
});

describe("voice: song and artist (PRD VOC-4)", () => {
  it("splits 'song by artist' and Hindi 'artist ka song'", () => {
    assert.deepEqual(splitSongAndArtist("tum hi ho by arijit singh"), {
      title: "tum hi ho",
      artist: "arijit singh",
    });
    assert.deepEqual(splitSongAndArtist("arijit ka kesariya"), {
      title: "kesariya",
      artist: "arijit",
    });
    assert.deepEqual(splitSongAndArtist("paper boat"), { title: "paper boat", artist: null });
  });
});

describe("catalog filter (PRD CAT-2)", () => {
  it("builds the published-songs filter", () => {
    assert.deepEqual(publishedFilter("all"), { status: "published" });
    assert.deepEqual(publishedFilter("official"), { status: "published", catalog: "official" });
  });
  it("defaults to all and rejects unknown values", () => {
    assert.equal(searchQuerySchema.parse({ q: "tum" }).catalog, "all");
    assert.equal(searchQuerySchema.safeParse({ q: "tum", catalog: "x" }).success, false);
    assert.equal(searchQuerySchema.safeParse({ q: "   " }).success, false);
    assert.equal(browsePageQuerySchema.parse({ page: "2" }).page, 2);
    assert.equal(updateProfileSchema.safeParse({ catalogFilter: "official" }).success, true);
    assert.equal(updateProfileSchema.safeParse({ catalogFilter: "best" }).success, false);
  });
});

describe("admin genres & vibes validators", () => {
  it("accepts a known icon and a hex colour", () => {
    const parsed = createCategorySchema.parse({ name: "Sufi", icon: "Moon", colour: "#a855f7" });
    assert.equal(parsed.colour, "#A855F7");
    assert.equal(parsed.active, true);
  });
  it("rejects unknown icons, bad colours and slug edits", () => {
    assert.equal(
      createCategorySchema.safeParse({ name: "X", icon: "Rocket", colour: "#000000" }).success,
      false
    );
    assert.equal(
      createCategorySchema.safeParse({ name: "X", icon: "Moon", colour: "red" }).success,
      false
    );
    assert.equal(updateCategorySchema.safeParse({ slug: "new-slug" }).success, false);
    assert.equal(updateCategorySchema.safeParse({}).success, false);
  });
});

describe("voice log is text only (PRD VOC-6)", () => {
  it("accepts a transcript and rejects anything else", () => {
    const entry = { transcript: "agla gaana", language: "hi-IN", intent: "next", outcome: "done" };
    assert.equal(voiceLogSchema.safeParse(entry).success, true);
    assert.equal(voiceLogSchema.safeParse({ ...entry, language: "fr-FR" }).success, false);
    assert.equal(voiceLogSchema.safeParse({ ...entry, intent: "hack" }).success, false);
    assert.equal(
      voiceLogSchema.safeParse({ ...entry, transcript: "x".repeat(201) }).success,
      false
    );
  });
});
