/**
 * Unit tests for quiz artist suggestions: relevance scoring, query parsing,
 * and the starter artist data.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreArtistForTaste } from "../src/services/onboarding.service.js";
import { artistSuggestionsQuerySchema } from "../src/validators/user.validator.js";
import { ARTISTS } from "../scripts/data/artists.js";
import { GENRES, VIBES } from "../scripts/data/taxonomy.js";

const picks = { genres: ["punjabi", "hip-hop"], vibes: ["gym"] };

describe("scoreArtistForTaste", () => {
  it("genre matches count more than vibe matches", () => {
    const genreMatch = scoreArtistForTaste(
      { genres: ["punjabi"], vibes: [], popularity: 0 },
      picks
    );
    const vibeMatch = scoreArtistForTaste({ genres: [], vibes: ["gym"], popularity: 0 }, picks);
    assert.ok(genreMatch > vibeMatch);
  });

  it("more overlap ranks higher", () => {
    const strong = scoreArtistForTaste({ genres: ["punjabi", "hip-hop"], vibes: ["gym"] }, picks);
    const weak = scoreArtistForTaste({ genres: ["punjabi"], vibes: [] }, picks);
    assert.ok(strong > weak);
  });

  it("popularity only breaks ties (never beats a real match)", () => {
    const famousNoMatch = scoreArtistForTaste(
      { genres: ["jazz"], vibes: [], popularity: 100 },
      picks
    );
    const unknownMatch = scoreArtistForTaste({ genres: [], vibes: ["gym"], popularity: 0 }, picks);
    assert.ok(unknownMatch > famousNoMatch);
    assert.ok(
      scoreArtistForTaste({ genres: ["punjabi"], popularity: 90 }, picks) >
        scoreArtistForTaste({ genres: ["punjabi"], popularity: 10 }, picks)
    );
  });

  it("handles artists without tags", () => {
    assert.equal(scoreArtistForTaste({}, picks), 0);
  });
});

describe("artist suggestions query", () => {
  it("parses comma-separated slugs", () => {
    const result = artistSuggestionsQuerySchema.parse({ genres: "lo-fi,Indie", vibes: "code" });
    assert.deepEqual(result, { genres: ["lo-fi", "indie"], vibes: ["code"] });
  });

  it("allows no picks and rejects bad slugs", () => {
    assert.deepEqual(artistSuggestionsQuerySchema.parse({}), { genres: [], vibes: [] });
    assert.equal(artistSuggestionsQuerySchema.safeParse({ genres: "$where" }).success, false);
  });
});

describe("starter artist data", () => {
  const genreSlugs = new Set(GENRES.map((genre) => genre.slug));
  const vibeSlugs = new Set(VIBES.map((vibe) => vibe.slug));

  it("every tag is a real genre / vibe slug", () => {
    for (const artist of ARTISTS) {
      for (const genre of artist.genres)
        assert.ok(genreSlugs.has(genre), `${artist.stageName}: ${genre}`);
      for (const vibe of artist.vibes)
        assert.ok(vibeSlugs.has(vibe), `${artist.stageName}: ${vibe}`);
    }
  });

  it("slugs are unique and URL-safe", () => {
    const slugs = ARTISTS.map((artist) => artist.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("India is well represented and every genre has an artist", () => {
    assert.ok(ARTISTS.filter((artist) => artist.country === "IN").length >= 30);
    for (const genre of genreSlugs) {
      assert.ok(
        ARTISTS.some((artist) => artist.genres.includes(genre)),
        `no artist for ${genre}`
      );
    }
  });
});
