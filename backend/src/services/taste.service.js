/**
 * Taste profile updates from library actions (roadmap Day 6, PRD 10.4.1):
 * like +5 / unlike −5 / add to playlist +4 change the weights of the song's
 * genres, vibes, mood and artist; follow +4 / unfollow −4 change the artist's
 * weight. The recommendation engine (Day 8) reads these weights.
 */
import { TasteProfile } from "../models/tasteProfile.model.js";
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
 * @returns {Promise<void>}
 */
export async function applyTasteIncrement(userId, increment, reason) {
  if (Object.keys(increment).length === 0) return;
  try {
    await TasteProfile.updateOne({ userId }, { $inc: increment }, { upsert: true });
  } catch (error) {
    logger.warn(`[TasteService] ${reason} update failed for userId=${userId}: ${error.message}`);
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
