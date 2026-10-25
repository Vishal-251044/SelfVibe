/**
 * For You feed (PRD 10.4.3/10.4.4, CAT-4, roadmap Day 8):
 *   Jump back in · Made for You · Right now: <vibe> · Trending · Fresh creators
 * - Recommendations are scored by the v1 engine (scoring.js) and picked with
 *   the diversity rules (feedRules.js): max 2 per artist, 70/30 familiar /
 *   discovery, about 20% Community songs when the switch is on All
 * - Songs heard in the last 24 h and "Not interested" songs are left out
 *   (Jump back in is your recent history, so it's the exception)
 * - Sections are cached for 1 hour per user + catalog (feedCache), and
 *   rebuilt early after heavy activity or when the time of day changes.
 *   Jump back in is always live.
 */
import mongoose from "mongoose";
import { Track } from "../../models/track.model.js";
import { ArtistProfile } from "../../models/artistProfile.model.js";
import { ListenEvent } from "../../models/listenEvent.model.js";
import { TasteProfile } from "../../models/tasteProfile.model.js";
import { FeedCache } from "../../models/feedCache.model.js";
import { getActiveTaxonomy } from "../search.service.js";
import { getTrending, publishedFilter } from "../browse.service.js";
import { getListeningHistory } from "../listening.service.js";
import { applyTrackSignal } from "../taste.service.js";
import { pickDiverse, pickRightNowVibe } from "./feedRules.js";
import { prepareTaste, rankTracks } from "./scoring.js";
import { ApiError } from "../../utils/ApiError.js";
import { logger } from "../../utils/logger.js";
import {
  ERROR_CODES,
  FEED_CACHE_TTL_SECONDS,
  FEED_HIDDEN_MAX,
  FEED_RULES,
  FEED_SECTION_SIZES,
  LISTEN_TASTE_SIGNALS,
  RIGHT_NOW_VIBES,
} from "../../config/constants.js";

const ARTIST_REF_FIELDS = "stageName slug avatar verified";
const POOL_FIELDS = "artistId genres vibes mood energy catalog playCount publishedAt";
const POOL_CACHE_MS = 2 * 60 * 1000;
const HISTORY_DAYS = 30;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DUPLICATE_KEY = 11000;
const RIGHT_NOW_MIN_SONGS = 4;
const DAY_PART_LABELS = [
  "Morning picks",
  "For the working day",
  "Evening energy",
  "Late-night picks",
  "After midnight",
];
const poolCache = new Map(); // catalog → { at, tracks }

/* ===== Inputs ===== */

/**
 * Every published song that can be recommended (light fields), cached briefly.
 * @param {string} catalog
 * @returns {Promise<Object[]>}
 */
async function getCandidatePool(catalog) {
  const cached = poolCache.get(catalog);
  if (cached && Date.now() - cached.at < POOL_CACHE_MS) return cached.tracks;
  const docs = await Track.find(publishedFilter(catalog)).select(POOL_FIELDS).lean();
  const tracks = docs.map((doc) => ({
    id: String(doc._id),
    artistId: String(doc.artistId),
    genres: doc.genres ?? [],
    vibes: doc.vibes ?? [],
    mood: doc.mood ?? null,
    energy: doc.energy ?? null,
    catalog: doc.catalog ?? "community",
    playCount: doc.playCount ?? 0,
    publishedAt: doc.publishedAt,
  }));
  poolCache.set(catalog, { at: Date.now(), tracks });
  return tracks;
}

/** Forget cached candidate pools (tests). */
export function resetFeedPools() {
  poolCache.clear();
}

/**
 * What the user played recently.
 * @param {string} userId
 * @returns {Promise<{ last24h: Set<string>, last7d: Set<string>, heardTrackIds: Set<string> }>}
 */
async function getRecentListening(userId) {
  const now = Date.now();
  const events = await ListenEvent.find({
    userId: new mongoose.Types.ObjectId(String(userId)),
    type: { $in: ["play", "repeat"] },
    createdAt: { $gte: new Date(now - HISTORY_DAYS * DAY_MS) },
  })
    .select("trackId createdAt")
    .lean();
  const last24h = new Set();
  const last7d = new Set();
  const heardTrackIds = new Set();
  for (const event of events) {
    const id = String(event.trackId);
    const age = now - event.createdAt.getTime();
    heardTrackIds.add(id);
    if (age < FEED_RULES.noRepeatHours * HOUR_MS) last24h.add(id);
    if (age < FEED_RULES.recentlyPlayedDays * DAY_MS) last7d.add(id);
  }
  return { last24h, last7d, heardTrackIds };
}

/* ===== "Why this?" text ===== */

/**
 * Turn reason codes into labels ("Because you like Lo-fi").
 * @param {Array<{ track: Object, reason: Object }>} items
 * @param {{ section: string, vibeName?: string }} context
 * @returns {Promise<string[]>}
 */
async function describeReasons(items, { section, vibeName }) {
  const { genres, vibes } = await getActiveTaxonomy();
  const genreName = new Map(genres.map((genre) => [genre.slug, genre.name]));
  const vibeNames = new Map(vibes.map((vibe) => [vibe.slug, vibe.name]));
  const artistIds = items
    .filter((item) => item.reason.type === "artist")
    .map((item) => item.reason.key);
  const artists = artistIds.length
    ? await ArtistProfile.find({ _id: { $in: artistIds } })
        .select("stageName")
        .lean()
    : [];
  const artistName = new Map(artists.map((artist) => [String(artist._id), artist.stageName]));

  return items.map(({ reason }) => {
    const genre = reason.type === "genre" ? genreName.get(reason.key) : null;
    if (section === "freshCreators") {
      return genre ? `New creator · matches your ${genre}` : "New creator on SelfVibe";
    }
    if (reason.type === "artist" && artistName.has(reason.key)) {
      return `Because you listen to ${artistName.get(reason.key)}`;
    }
    if (genre) return `Because you like ${genre}`;
    if (reason.type === "vibe" && vibeNames.has(reason.key)) {
      return `Matches your ${vibeNames.get(reason.key)} vibe`;
    }
    if (section === "rightNow" && vibeName) return `Popular in ${vibeName} vibe`;
    if (reason.type === "new") return "New on SelfVibe";
    if (reason.type === "popular") return "Popular on SelfVibe";
    return "Something new for you";
  });
}

/* ===== Building the cached sections ===== */

/**
 * Build the recommendation sections (not Jump back in).
 * @param {string} userId
 * @param {{ catalog: string, hour: number, taste: Object, hidden: Set<string> }} options
 * @returns {Promise<{ dayPart: number, sections: Object[] }>}
 */
async function buildSections(userId, { catalog, hour, taste, hidden }) {
  const [pool, listening, taxonomy] = await Promise.all([
    getCandidatePool(catalog),
    getRecentListening(userId),
    getActiveTaxonomy(),
  ]);
  const heardArtists = new Set(
    pool.filter((track) => listening.heardTrackIds.has(track.id)).map((track) => track.artistId)
  );
  // A creator's own songs are never recommended back to them
  const ownArtist = await ArtistProfile.findOne({ userId }).select("_id").lean();
  const ownArtistId = ownArtist ? String(ownArtist._id) : null;
  const candidates = pool.filter(
    (track) =>
      !hidden.has(track.id) && !listening.last24h.has(track.id) && track.artistId !== ownArtistId
  );
  const ranked = rankTracks(candidates, taste, { recentlyPlayed: listening.last7d, heardArtists });
  const communityShare = catalog === "all" ? FEED_RULES.communityShareWithAll : null;
  const sections = [];

  // Made for You — cold start (no taste yet) falls back to popular + new songs (ONB-2)
  const madeForYou = pickDiverse(ranked, {
    size: FEED_SECTION_SIZES.madeForYou,
    familiarShare: taste.hasTaste ? FEED_RULES.familiarShare : null,
    communityShare,
  });
  const usedIds = new Set(madeForYou.map((item) => item.track.id));
  sections.push({
    key: "madeForYou",
    title: "Made for You",
    subtitle: taste.hasTaste
      ? "Picked from what you play, like and follow"
      : "Popular picks while we learn your taste",
    items: madeForYou,
  });

  // Right now: <vibe> — time of day, leaning to the vibe the user likes most
  const activeVibes = new Set(taxonomy.vibes.map((vibe) => vibe.slug));
  const { dayPart, options } = pickRightNowVibe(hour, taste.vibe, RIGHT_NOW_VIBES, activeVibes);
  // The best-fitting vibe that actually has enough songs right now
  const inVibeOf = (slug) =>
    ranked.filter((item) => item.track.vibes.includes(slug) && !usedIds.has(item.track.id));
  const vibe =
    options.find((slug) => inVibeOf(slug).length >= RIGHT_NOW_MIN_SONGS) ??
    options.find((slug) => inVibeOf(slug).length > 0) ??
    null;
  if (vibe) {
    const vibeName = taxonomy.vibes.find((item) => item.slug === vibe)?.name ?? vibe;
    const inVibe = inVibeOf(vibe);
    sections.push({
      key: "rightNow",
      title: `Right now: ${vibeName}`,
      subtitle: DAY_PART_LABELS[dayPart] ?? "",
      vibe,
      vibeName,
      items: pickDiverse(inVibe, {
        size: FEED_SECTION_SIZES.rightNow,
        familiarShare: null,
        communityShare,
      }),
    });
  }

  // Trending — the 7-day chart (hidden songs left out), max 2 per artist
  const chart = (await getTrending({ catalog, limit: FEED_SECTION_SIZES.trending * 2 }))
    .map(({ track }) => ({
      track: {
        id: String(track._id),
        artistId: String(track.artistId?._id ?? track.artistId),
        catalog: track.catalog,
      },
      familiar: true,
      reason: { type: "trending" },
    }))
    .filter((item) => !hidden.has(item.track.id));
  sections.push({
    key: "trending",
    title: "Trending",
    subtitle: "Most played this week",
    items: pickDiverse(chart, { size: FEED_SECTION_SIZES.trending, familiarShare: null }),
  });

  // Fresh creators — new Community artists the user hasn't heard, best taste match first
  if (catalog !== "official") {
    const freshSince = Date.now() - FEED_RULES.freshnessDays * DAY_MS;
    const fresh = ranked.filter(
      (item) =>
        item.track.catalog === "community" &&
        !heardArtists.has(item.track.artistId) &&
        item.track.publishedAt &&
        new Date(item.track.publishedAt).getTime() >= freshSince
    );
    sections.push({
      key: "freshCreators",
      title: "Fresh creators",
      subtitle: "New artists that match your taste",
      items: pickDiverse(fresh, {
        size: FEED_SECTION_SIZES.freshCreators,
        maxPerArtist: 1,
        familiarShare: null,
      }),
    });
  }

  // Store ids + "why this?" text only
  for (const section of sections) {
    const labels =
      section.key === "trending"
        ? section.items.map((_, index) =>
            index < 3 ? `#${index + 1} this week` : "Trending this week"
          )
        : await describeReasons(section.items, {
            section: section.key,
            vibeName: section.vibeName,
          });
    section.items = section.items.map((item, index) => ({
      trackId: item.track.id,
      reason: labels[index],
    }));
    delete section.vibeName;
  }
  return { dayPart, sections };
}

/* ===== Reading the feed ===== */

/**
 * Load cached items as full songs, in order, dropping songs that are gone,
 * hidden, outside the catalog switch, or played since the cache was built
 * (no repeats within 24 h — the Trending chart is the exception).
 * @param {Object[]} sections
 * @param {string} catalog
 * @param {Set<string>} hidden
 * @param {Set<string>} playedRecently - Played in the last 24 h
 * @returns {Promise<Object[]>}
 */
async function hydrateSections(sections, catalog, hidden, playedRecently) {
  const ids = [
    ...new Set(sections.flatMap((section) => section.items.map((item) => String(item.trackId)))),
  ];
  const tracks = ids.length
    ? await Track.find({ _id: { $in: ids }, ...publishedFilter(catalog) })
        .populate("artistId", ARTIST_REF_FIELDS)
        .lean()
    : [];
  const byId = new Map(tracks.map((track) => [String(track._id), track]));
  return sections.map((section) => ({
    key: section.key,
    title: section.title,
    subtitle: section.subtitle ?? "",
    vibe: section.vibe ?? null,
    items: section.items
      .filter((item) => {
        const id = String(item.trackId);
        const isRepeat = section.key !== "trending" && playedRecently.has(id);
        return byId.has(id) && !hidden.has(id) && !isRepeat;
      })
      .map((item) => ({ track: byId.get(String(item.trackId)), reason: item.reason })),
  }));
}

/**
 * Jump back in: the last songs you played (unique, newest first), plus every
 * song played in the last 24 h (kept out of the other sections). Always live.
 * @param {string} userId
 * @param {string} catalog
 * @returns {Promise<{ section: Object, playedRecently: Set<string> }>}
 */
async function recentListening(userId, catalog) {
  const history = await getListeningHistory(userId, 40);
  const since = Date.now() - FEED_RULES.noRepeatHours * HOUR_MS;
  const playedRecently = new Set(
    history
      .filter(({ playedAt }) => new Date(playedAt).getTime() >= since)
      .map(({ track }) => String(track._id))
  );
  const seen = new Set();
  const items = [];
  for (const { track } of history) {
    const id = String(track._id);
    if (seen.has(id) || (catalog !== "all" && track.catalog !== catalog)) continue;
    seen.add(id);
    items.push({ track, reason: "You played this recently" });
    if (items.length >= FEED_SECTION_SIZES.jumpBackIn) break;
  }
  const section = {
    key: "jumpBackIn",
    title: "Jump back in",
    subtitle: "Pick up where you left off",
    vibe: null,
    items,
  };
  return { section, playedRecently };
}

/**
 * The For You feed.
 * @param {string} userId
 * @param {{ catalog?: "all"|"official"|"community", hour?: number, refresh?: boolean }} [options]
 * @returns {Promise<{ sections: Object[], generatedAt: Date, cached: boolean }>}
 */
export async function getForYouFeed(
  userId,
  { catalog = "all", hour = new Date().getHours(), refresh = false } = {}
) {
  const profile = await TasteProfile.findOne({ userId }).lean();
  const taste = prepareTaste(profile);
  const hidden = new Set((profile?.hiddenTrackIds ?? []).map(String));
  const { dayPart } = pickRightNowVibe(hour, taste.vibe, RIGHT_NOW_VIBES);

  let cache = refresh ? null : await FeedCache.findOne({ userId, catalog }).lean();
  const isFresh = cache && cache.dayPart === dayPart && cache.expiresAt > new Date();
  if (!isFresh) {
    const started = Date.now();
    const built = await buildSections(userId, { catalog, hour, taste, hidden });
    const doc = {
      dayPart: built.dayPart,
      sections: built.sections,
      signalsSince: 0,
      expiresAt: new Date(Date.now() + FEED_CACHE_TTL_SECONDS * 1000),
    };
    try {
      await FeedCache.updateOne({ userId, catalog }, { $set: doc }, { upsert: true });
    } catch (error) {
      if (error.code !== DUPLICATE_KEY) throw error; // two tabs built it at once — either copy is fine
    }
    cache = { ...doc, createdAt: new Date() };
    logger.debug(`[Feed] built userId=${userId} catalog=${catalog} in ${Date.now() - started}ms`);
  }

  const { section: recent, playedRecently } = await recentListening(userId, catalog);
  const sections = await hydrateSections(cache.sections, catalog, hidden, playedRecently);
  return {
    sections: [recent, ...sections].filter((section) => section.items.length > 0),
    generatedAt: cache.createdAt ?? new Date(),
    cached: Boolean(isFresh),
  };
}

/* ===== "Not interested" (PRD 10.4.4 feedback loop) ===== */

/**
 * Hide a song from recommendations and lower its tags (−5).
 * @param {string} userId
 * @param {string} trackId
 * @returns {Promise<{ trackId: string, hidden: true }>}
 * @throws {ApiError} 404 when the song doesn't exist
 */
export async function markNotInterested(userId, trackId) {
  const track = await Track.findOne({ _id: trackId, status: "published" })
    .select("genres vibes mood artistId")
    .lean();
  if (!track) throw ApiError.notFound("Song not found", { code: ERROR_CODES.NOT_FOUND });

  const id = new mongoose.Types.ObjectId(String(trackId));
  const profile = await TasteProfile.findOne({ userId }).select("hiddenTrackIds").lean();
  const isAlreadyHidden = (profile?.hiddenTrackIds ?? []).some((hiddenId) => hiddenId.equals(id));
  if (!isAlreadyHidden) {
    await TasteProfile.updateOne(
      { userId },
      { $push: { hiddenTrackIds: { $each: [id], $slice: -FEED_HIDDEN_MAX } } },
      { upsert: true }
    );
    await applyTrackSignal(userId, track, LISTEN_TASTE_SIGNALS.notInterested, "not-interested");
  }
  // Out of every cached section right away
  await FeedCache.updateMany({ userId }, { $pull: { "sections.$[].items": { trackId: id } } });
  return { trackId: String(trackId), hidden: true };
}

/**
 * Undo "Not interested" (restores the tag weights).
 * @param {string} userId
 * @param {string} trackId
 * @returns {Promise<{ trackId: string, hidden: false }>}
 */
export async function undoNotInterested(userId, trackId) {
  const id = new mongoose.Types.ObjectId(String(trackId));
  const result = await TasteProfile.updateOne(
    { userId, hiddenTrackIds: id },
    { $pull: { hiddenTrackIds: id } }
  );
  if (result.modifiedCount > 0) {
    const track = await Track.findById(trackId).select("genres vibes mood artistId").lean();
    if (track)
      await applyTrackSignal(
        userId,
        track,
        -LISTEN_TASTE_SIGNALS.notInterested,
        "not-interested undo"
      );
    await FeedCache.deleteMany({ userId }); // the song may belong back in a section
  }
  return { trackId: String(trackId), hidden: false };
}
