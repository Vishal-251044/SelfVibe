/**
 * Listening events and history (PRD PLY-7, BGP-7, roadmap Day 5).
 *
 * The client reports two moments per listen, tied together by a sessionId:
 *  - "start" → a `play` event (or `repeat` when the same song is played again),
 *    and the track's playCount goes up by one
 *  - "end"   → the play event gets the time listened and %, plus a `skip`
 *    event when under 30 s was heard, or a `complete` event at 80% or more
 * Batches can be re-sent (offline, page hidden): the unique sessionId + type
 * index makes duplicates harmless, and playCount only counts new plays.
 */
import mongoose from "mongoose";
import { ListenEvent } from "../models/listenEvent.model.js";
import { Track } from "../models/track.model.js";
import {
  LISTEN_COMPLETE_PERCENT,
  LISTEN_HISTORY_LIMIT,
  LISTEN_SKIP_MAX_MS,
} from "../config/constants.js";
import { logger } from "../utils/logger.js";

const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // older queued events are dropped
const DUPLICATE_KEY = 11000;

/**
 * Outcome of a finished listen (pure — unit tested).
 * @param {{ msListened: number, percent: number }} end
 * @returns {"skip"|"complete"|null} null = a partial play (30 s – 80%)
 */
export function classifyListenEnd({ msListened, percent }) {
  if (percent >= LISTEN_COMPLETE_PERCENT) return "complete";
  if (msListened < LISTEN_SKIP_MAX_MS) return "skip";
  return null;
}

/**
 * When the event happened, kept within sane limits (clock skew, stale queues).
 * @param {Date|undefined} at
 * @param {Date} now
 * @returns {Date|null} null when the event is too old to keep
 */
function eventTime(at, now) {
  if (!at) return now;
  if (now - at > MAX_EVENT_AGE_MS) return null;
  return at > now ? now : at;
}

/**
 * Insert documents, ignoring ones that already exist (re-sent batches).
 * @param {Object[]} docs
 * @returns {Promise<Object[]>} The documents that were actually inserted
 */
async function insertNew(docs) {
  if (docs.length === 0) return [];
  try {
    return await ListenEvent.insertMany(docs, { ordered: false });
  } catch (error) {
    const isOnlyDuplicates = error.writeErrors?.every((entry) => entry.code === DUPLICATE_KEY);
    if (error.code !== DUPLICATE_KEY && !isOnlyDuplicates) throw error;
    return error.insertedDocs ?? [];
  }
}

/**
 * Record a batch of listening events for one user.
 * @param {string} userId
 * @param {Array<{ sessionId: string, trackId: string, kind: "start"|"end", repeat?: boolean, msListened?: number, percent?: number, source?: string, device?: string, hour?: number, at?: Date }>} events
 * @returns {Promise<{ accepted: number, plays: number }>}
 */
export async function recordListenEvents(userId, events) {
  const now = new Date();
  const trackIds = [...new Set(events.map((event) => event.trackId))];
  // Only real tracks a listener could hear: published, or the user's own upload
  const tracks = await Track.find({
    _id: { $in: trackIds },
    $or: [{ status: "published" }, { uploadedBy: userId }],
  })
    .select("_id status")
    .lean();
  const playable = new Map(tracks.map((track) => [String(track._id), track]));

  const starts = [];
  const ends = [];
  for (const event of events) {
    const createdAt = eventTime(event.at, now);
    if (!createdAt || !playable.has(event.trackId)) continue;
    const base = {
      userId,
      trackId: event.trackId,
      sessionId: event.sessionId,
      context: {
        source: event.source ?? null,
        hour: event.hour ?? null,
        device: event.device ?? null,
      },
      createdAt,
    };
    if (event.kind === "start") {
      starts.push({ ...base, type: event.repeat ? "repeat" : "play" });
    } else {
      ends.push({ ...base, msListened: event.msListened ?? 0, percent: event.percent ?? 0 });
    }
  }

  // Starts: new plays raise playCount (published tracks only)
  const insertedStarts = await insertNew(starts);
  const playsPerTrack = new Map();
  for (const doc of insertedStarts) {
    if (playable.get(String(doc.trackId))?.status !== "published") continue;
    const id = String(doc.trackId);
    playsPerTrack.set(id, (playsPerTrack.get(id) ?? 0) + 1);
  }
  if (playsPerTrack.size > 0) {
    await Track.bulkWrite(
      [...playsPerTrack].map(([id, count]) => ({
        updateOne: { filter: { _id: id }, update: { $inc: { playCount: count } } },
      }))
    );
  }

  // Ends: time listened on the play event, plus a skip / complete event
  const outcomes = [];
  for (const end of ends) {
    await ListenEvent.updateOne(
      { sessionId: end.sessionId, userId, type: { $in: ["play", "repeat"] } },
      { $max: { msListened: end.msListened, percent: end.percent } }
    );
    const outcome = classifyListenEnd(end);
    if (outcome) outcomes.push({ ...end, type: outcome });
  }
  const insertedOutcomes = await insertNew(outcomes);

  logger.debug(
    `[Listening] userId=${userId} accepted ${insertedStarts.length + insertedOutcomes.length} events (${events.length} sent)`
  );
  return {
    accepted: insertedStarts.length + insertedOutcomes.length,
    plays: insertedStarts.length,
  };
}

/**
 * The user's last plays, newest first (roadmap Day 5: last 100).
 * Tracks that are no longer available are left out.
 * @param {string} userId
 * @param {number} [limit]
 * @returns {Promise<Array<{ playedAt: Date, track: Object }>>}
 */
export async function getListeningHistory(userId, limit = LISTEN_HISTORY_LIMIT) {
  const events = await ListenEvent.find({
    userId: new mongoose.Types.ObjectId(String(userId)),
    type: { $in: ["play", "repeat"] },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({
      path: "trackId",
      match: { status: "published" },
      populate: { path: "artistId", select: "stageName slug avatar verified" },
    })
    .lean();
  return events
    .filter((event) => event.trackId)
    .map((event) => ({ playedAt: event.createdAt, track: event.trackId }));
}
