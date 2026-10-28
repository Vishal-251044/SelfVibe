/**
 * Which audio copy the player should ask for. "Auto" keeps music playing on
 * slow internet: it uses the 64 kbps copy when the browser reports a slow or
 * data-saving connection, or after the player itself noticed buffering, and
 * goes back to normal quality a few minutes later.
 */
import { LOW_DATA_HOLD_MS, STALLS_BEFORE_SWITCH, STALL_WINDOW_MS } from "@/utils/musicConstants";

const SLOW_CONNECTION_TYPES = new Set(["slow-2g", "2g", "3g"]);
const SLOW_DOWNLINK_MBPS = 0.7; // below this a 128 kbps stream can't keep a safe buffer

let lowDataUntil = 0;
let recentStalls = [];

/**
 * Whether the browser says the connection is slow or data saving is on.
 * (Network Information API: Chrome / Android; other browsers report nothing.)
 * @returns {boolean}
 */
export function connectionLooksSlow() {
  if (typeof navigator === "undefined") return false;
  const connection = navigator.connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  if (SLOW_CONNECTION_TYPES.has(connection.effectiveType)) return true;
  return typeof connection.downlink === "number" && connection.downlink > 0
    ? connection.downlink < SLOW_DOWNLINK_MBPS
    : false;
}

/**
 * Whether Auto should use the small copy right now.
 * @returns {boolean}
 */
export function isLowDataMode() {
  return Date.now() < lowDataUntil || connectionLooksSlow();
}

/**
 * The quality to request for a preference.
 * @param {"auto"|"low"|"standard"|"high"} preference
 * @returns {"auto"|"low"|"standard"|"high"} "auto" lets the API pick the plan's best
 */
export function resolveStreamQuality(preference) {
  if (preference !== "auto") return preference;
  return isLowDataMode() ? "low" : "auto";
}

/** Slow internet was noticed: use the small copy for a while. */
export function markSlowNetwork() {
  lowDataUntil = Date.now() + LOW_DATA_HOLD_MS;
  recentStalls = [];
}

/**
 * Count a buffering pause. Returns true when there were enough of them
 * recently to call the connection slow.
 * @returns {boolean}
 */
export function recordStall() {
  const now = Date.now();
  recentStalls = [...recentStalls.filter((at) => now - at < STALL_WINDOW_MS), now];
  return recentStalls.length >= STALLS_BEFORE_SWITCH;
}

/** Forget what was noticed (log out, tests). */
export function resetNetworkQuality() {
  lowDataUntil = 0;
  recentStalls = [];
}
