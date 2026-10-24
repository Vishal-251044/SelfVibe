/**
 * Unit tests for Day 6: comment spam / abuse filter, taste-signal increments,
 * comment labels ("Artist" / "SelfVibe") and library validators.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkCommentContent, normaliseForFilter } from "../src/utils/contentFilter.js";
import { tasteIncrementForTrack } from "../src/services/taste.service.js";
import { toPublicComment } from "../src/services/comment.service.js";
import {
  createCommentSchema,
  createPlaylistSchema,
  updatePlaylistSchema,
} from "../src/validators/library.validator.js";

describe("comment filter (PRD CMT-3)", () => {
  it("allows normal comments, including mild language and one or two links", () => {
    assert.equal(checkCommentContent("This beat is crazy good, damn!").ok, true);
    assert.equal(checkCommentContent("Live version: https://example.com/a").ok, true);
    assert.equal(checkCommentContent("Hindi lyrics bahut acche hain").ok, true);
  });
  it("blocks slurs and targeted abuse, also with l33t spelling or dots", () => {
    assert.equal(checkCommentContent("you are a chutiya").ok, false);
    assert.equal(checkCommentContent("C.H.U.T.I.Y.A").ok, false);
    assert.equal(checkCommentContent("bh3nch0d").ok, false);
    assert.equal(checkCommentContent("just kys").ok, false);
  });
  it("blocks link spam and character floods", () => {
    assert.equal(checkCommentContent("a http://x.io b https://y.io c www.z.io").ok, false);
    assert.equal(checkCommentContent("niceeeeeeeeeeeeeeeeeee").ok, false);
  });
  it("normalises l33t spelling", () => {
    assert.equal(normaliseForFilter("H3ll0 W0rld!"), "hello worldi");
  });
});

describe("taste signals (PRD 10.4.1)", () => {
  it("adds the weight to each genre, vibe, the mood and the artist", () => {
    const increment = tasteIncrementForTrack(
      { genres: ["pop", "pop", "indie"], vibes: ["chill"], mood: "calm", artistId: "a1" },
      5
    );
    assert.deepEqual(increment, {
      "genreWeights.pop": 5,
      "genreWeights.indie": 5,
      "vibeWeights.chill": 5,
      "moodWeights.calm": 5,
      "artistWeights.a1": 5,
    });
  });
  it("skips missing tags", () => {
    assert.deepEqual(tasteIncrementForTrack({ genres: [], mood: null }, -5), {});
  });
});

describe("comment shape and labels (PRD CMT-2)", () => {
  const base = {
    _id: "c1",
    trackId: "t1",
    parentId: null,
    body: "Love it",
    likeCount: 2,
    replyCount: 1,
    status: "visible",
    createdAt: new Date(),
  };
  const context = { artistUserId: "u-artist", likedIds: new Set(["c1"]) };
  it("labels the song's artist and staff", () => {
    const artist = toPublicComment({ ...base, userId: { _id: "u-artist", name: "Asha" } }, context);
    const staff = toPublicComment(
      { ...base, userId: { _id: "u2", name: "Team", staffRole: "owner" } },
      context
    );
    const listener = toPublicComment({ ...base, userId: { _id: "u3", name: "Bo" } }, context);
    assert.equal(artist.label, "artist");
    assert.equal(staff.label, "selfvibe");
    assert.equal(listener.label, null);
    assert.equal(listener.likedByMe, true);
  });
  it("deleted comments hide their text and author", () => {
    const removed = toPublicComment(
      { ...base, status: "removed", userId: { _id: "u3", name: "Bo" } },
      context
    );
    assert.equal(removed.body, null);
    assert.equal(removed.author, null);
    assert.equal(removed.isRemoved, true);
  });
});

describe("library validators", () => {
  it("playlists need a name; cover can be removed with null", () => {
    assert.equal(createPlaylistSchema.safeParse({ name: "  " }).success, false);
    assert.equal(createPlaylistSchema.safeParse({ name: "Gym" }).data.isPublic, false);
    assert.equal(updatePlaylistSchema.safeParse({ coverKey: null }).success, true);
    assert.equal(updatePlaylistSchema.safeParse({}).success, false);
  });
  it("comments are 1–1000 characters", () => {
    assert.equal(createCommentSchema.safeParse({ body: "" }).success, false);
    assert.equal(createCommentSchema.safeParse({ body: "x".repeat(1001) }).success, false);
    assert.equal(createCommentSchema.safeParse({ body: "Nice" }).success, true);
  });
});
