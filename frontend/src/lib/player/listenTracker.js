/**
 * Turns playback into listening events (PRD PLY-7): one session per time a
 * song is played. "start" is sent when audio actually begins; "end" when the
 * song is left (finished, skipped, another song started) with the real time
 * listened — the API decides skip (< 30 s) / complete (≥ 80%) / partial.
 * Staff previews are never tracked.
 */
import { enqueueListenEvent } from "@/lib/player/listenEventQueue";
import { createId } from "@/utils/genericFunctions";

let session = null;

/** @returns {"mobile"|"tablet"|"desktop"} Rough device class for event context */
function deviceType() {
  if (typeof window === "undefined") return "desktop";
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (!isTouch) return "desktop";
  return window.innerWidth >= 768 ? "tablet" : "mobile";
}

/**
 * Shared fields of every event.
 * @param {Object} current - The session
 * @returns {Object}
 */
function baseEvent(current) {
  return {
    sessionId: current.sessionId,
    trackId: current.trackId,
    source: current.source ?? undefined,
    device: deviceType(),
    hour: new Date().getHours(),
    at: new Date().toISOString(),
  };
}

/**
 * Prepare a session for a track that is about to play.
 * @param {{ id: string, durationSec: number }} track
 * @param {{ repeat: boolean, source: string|null, enabled: boolean }} options
 */
export function beginListen(track, { repeat, source, enabled }) {
  endListen();
  session = enabled
    ? {
        sessionId: createId(),
        trackId: track.id,
        durationSec: track.durationSec || 0,
        repeat,
        source,
        msListened: 0,
        hasStarted: false,
        lastPosition: null,
      }
    : null;
}

/** Audio really started playing: send "start" once per session. */
export function markListenPlaying() {
  if (!session || session.hasStarted) return;
  session.hasStarted = true;
  enqueueListenEvent({ ...baseEvent(session), kind: "start", repeat: session.repeat });
}

/**
 * Count listening time from the playhead (seeking doesn't count as listening).
 * @param {number} position - Current time in seconds
 * @param {boolean} isPlaying
 * @param {number} [duration] - Known duration in seconds
 */
export function trackListenProgress(position, isPlaying, duration) {
  if (!session) return;
  if (duration) session.durationSec = duration;
  const last = session.lastPosition;
  session.lastPosition = position;
  if (!isPlaying || last === null) return;
  const delta = position - last;
  if (delta > 0 && delta < 1.5) session.msListened += Math.round(delta * 1000);
}

/** The song was left: send "end" with the time listened. */
export function endListen() {
  if (session?.hasStarted) {
    const percent = session.durationSec
      ? Math.min(100, (session.msListened / (session.durationSec * 1000)) * 100)
      : 0;
    enqueueListenEvent({
      ...baseEvent(session),
      kind: "end",
      msListened: session.msListened,
      percent: Math.round(percent * 10) / 10,
    });
  }
  session = null;
}
