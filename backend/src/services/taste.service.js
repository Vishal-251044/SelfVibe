/**
 * Taste profile updates from library actions (roadmap Day 6, PRD 10.4.1):
 * like +5 / unlike −5 / add to playlist +4 change the weights of the song's
 * genres, vibes, mood and artist; follow +4 / unfollow −4 change the artist's
 * weight. Day 8 adds listening signals (complete / partial / skip / repeat)
 * and "Not interested". The recommendation engine reads these weights, and
 * enough new signals drop the user's cached feed.
 */
import { TasteProfile } from "../models/tasteProfile.model.js";
import { FeedCache } from "../models/feedCache.model.js";
import { Track } from "../models/track.model.js";
import { FEED_INVALIDATE_AFTER_SIGNALS, LISTEN_TASTE_SIGNALS } from "../config/constants.js";
import { logger } from "../utils/logger.js";

/**
 * MongoDB $inc for one track's tags (pure — unit tested).
 * @param {{ genres?: string[], vibes?: string[], mood?: string|null, artistId?: Object|string }} track
 * @param {number} weight
 * @returns {Object<string, number>}
 */
export function tasteIncrementForTrack(track, weight) {
  const increment = {};
  const add = (field, key) => {
    if (!key) return;
    const path = `${field}.${String(key)}`;
    increment[path] = (increment[path] ?? 0) + weight;
  };
  [...new Set(track.genres ?? [])].forEach((genre) => add("genreWeights", genre));
  [...new Set(track.vibes ?? [])].forEach((vibe) => add("vibeWeights", vibe));
  add("moodWeights", track.mood);
  add("artistWeights", track.artistId?._id ?? track.artistId);
  return increment;
}

/**
 * Apply a signal to the user's taste profile (created if missing).
 * Never throws: a failed taste update must not fail the like / follow itself.
 * @param {string} userId
 * @param {Object<string, number>} increment - From tasteIncrementForTrack, or a custom one
 * @param {string} reason - For the debug log
 * @param {number} [signals=1] - How many signals this is (feed cache invalidation)
 * @returns {Promise<void>}
 */
export async function applyTasteIncrement(userId, increment, reason, signals = 1) {
  if (Object.keys(increment).length === 0) return;
  try {
    await TasteProfile.updateOne({ userId }, { $inc: increment }, { upsert: true });
    await noteFeedActivity(userId, signals);
  } catch (error) {
    logger.warn(`[TasteService] ${reason} update failed for userId=${userId}: ${error.message}`);
  }
}

/**
 * Count new taste signals against the cached feed; drop it after heavy
 * activity so the next For You feed reflects what just happened (PRD 10.4.4).
 * @param {string} userId
 * @param {number} signals
 * @returns {Promise<void>}
 */
export async function noteFeedActivity(userId, signals) {
  await FeedCache.updateMany({ userId }, { $inc: { signalsSince: signals } });
  await FeedCache.deleteMany({ userId, signalsSince: { $gte: FEED_INVALIDATE_AFTER_SIGNALS } });
}

/**
 * Merge listening signals into one taste $inc (pure — unit tested).
 * @param {Array<{ trackId: string, weight: number }>} signals
 * @param {Map<string, Object>} tracksById - Tracks with genres, vibes, mood, artistId
 * @returns {Object<string, number>}
 */
export function listenIncrement(signals, tracksById) {
  const increment = {};
  for (const { trackId, weight } of signals) {
    const track = tracksById.get(String(trackId));
    if (!track) continue;
    for (const [path, value] of Object.entries(tasteIncrementForTrack(track, weight))) {
      increment[path] = (increment[path] ?? 0) + value;
    }
  }
  // Drop tags that cancel out (e.g. a skip then a repeat)
  return Object.fromEntries(Object.entries(increment).filter(([, value]) => value !== 0));
}

/**
 * Apply a batch of listening signals (PRD 10.4.1: +3 complete, +1 partial,
 * −2 skip, +2 repeat) to the taste vector, and nudge the preferred energy
 * towards songs that were heard to the end. Never throws.
 * @param {string} userId
 * @param {Array<{ trackId: string, weight: number }>} signals
 * @returns {Promise<void>}
 */
export async function applyListenSignals(userId, signals) {
  if (signals.length === 0) return;
  try {
    const ids = [...new Set(signals.map((signal) => String(signal.trackId)))];
    const tracks = await Track.find({ _id: { $in: ids } })
      .select("genres vibes mood artistId energy")
      .lean();
    const tracksById = new Map(tracks.map((track) => [String(track._id), track]));
    await applyTasteIncrement(
      userId,
      listenIncrement(signals, tracksById),
      "listening",
      signals.length
    );

    const completedEnergy = signals
      .filter((signal) => signal.weight === LISTEN_TASTE_SIGNALS.complete)
      .map((signal) => tracksById.get(String(signal.trackId))?.energy)
      .filter((energy) => typeof energy === "number");
    if (completedEnergy.length > 0) {
      const average =
        completedEnergy.reduce((total, energy) => total + energy, 0) / completedEnergy.length;
      // Moving average: 90% old preference, 10% what was just enjoyed
      await TasteProfile.updateOne({ userId }, [
        {
          $set: {
            energyPref: {
              $add: [{ $multiply: [{ $ifNull: ["$energyPref", 0.5] }, 0.9] }, 0.1 * average],
            },
          },
        },
      ]);
    }
  } catch (error) {
    logger.warn(`[TasteService] listening update failed for userId=${userId}: ${error.message}`);
  }
}

/**
 * Taste signal for one track.
 * @param {string} userId
 * @param {Object} track
 * @param {number} weight
 * @param {string} reason
 * @returns {Promise<void>}
 */
export function applyTrackSignal(userId, track, weight, reason) {
  return applyTasteIncrement(userId, tasteIncrementForTrack(track, weight), reason);
}

/**
 * Taste signal for an artist (follow / unfollow).
 * @param {string} userId
 * @param {string} artistId
 * @param {number} weight
 * @param {string} reason
 * @returns {Promise<void>}
 */
export function applyArtistSignal(userId, artistId, weight, reason) {
  return applyTasteIncrement(userId, { [`artistWeights.${artistId}`]: weight }, reason);
}
