/**
 * Unit tests for Day 5: how a finished listen is classified (skip / partial /
 * complete) and validation of event batches and stream batches.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyListenEnd } from "../src/services/listening.service.js";
import { listenEventsSchema, streamBatchSchema } from "../src/validators/listening.validator.js";

const TRACK = "64b000000000000000000009";
const event = (overrides = {}) => ({
  sessionId: "3f1c2a9e-5b7d-4c11-9e2a-7d6b5c4a3f21",
  trackId: TRACK,
  kind: "start",
  ...overrides,
});

describe("listen classification (PRD 10.4.1)", () => {
  it("under 30 s is a skip", () => {
    assert.equal(classifyListenEnd({ msListened: 12_000, percent: 6 }), "skip");
    assert.equal(classifyListenEnd({ msListened: 29_999, percent: 20 }), "skip");
  });
  it("80% or more is complete, even for very short tracks", () => {
    assert.equal(classifyListenEnd({ msListened: 200_000, percent: 80 }), "complete");
    assert.equal(classifyListenEnd({ msListened: 20_000, percent: 95 }), "complete");
  });
  it("30 s to 80% is a partial play (no extra event)", () => {
    assert.equal(classifyListenEnd({ msListened: 30_000, percent: 15 }), null);
    assert.equal(classifyListenEnd({ msListened: 120_000, percent: 79.9 }), null);
  });
});

describe("event batch validation", () => {
  it("accepts start and end events and maps unknown sources to 'other'", () => {
    const result = listenEventsSchema.safeParse({
      events: [
        event({ source: "artist", device: "mobile", hour: 21, at: "2026-10-26T10:00:00Z" }),
        event({ kind: "end", msListened: 61_000, percent: 40, source: "some-new-screen" }),
      ],
    });
    assert.equal(result.success, true);
    assert.equal(result.data.events[0].at instanceof Date, true);
    assert.equal(result.data.events[1].source, "other");
  });

  it("rejects bad ids, kinds, percentages and oversized batches", () => {
    assert.equal(
      listenEventsSchema.safeParse({ events: [event({ trackId: "x" })] }).success,
      false
    );
    assert.equal(
      listenEventsSchema.safeParse({ events: [event({ kind: "pause" })] }).success,
      false
    );
    assert.equal(
      listenEventsSchema.safeParse({ events: [event({ percent: 120 })] }).success,
      false
    );
    assert.equal(listenEventsSchema.safeParse({ events: [] }).success, false);
    assert.equal(listenEventsSchema.safeParse({ events: Array(51).fill(event()) }).success, false);
  });

  it("stream batches allow 1–20 tracks", () => {
    assert.equal(streamBatchSchema.safeParse({ trackIds: [TRACK] }).success, true);
    assert.equal(streamBatchSchema.safeParse({ trackIds: Array(21).fill(TRACK) }).success, false);
  });
});
