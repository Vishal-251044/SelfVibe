/**
 * Client-side queue for listening events (roadmap Day 5, PRD BGP-7).
 * Events are saved in the browser and sent in batches: every 15 s, when the
 * page is hidden (keepalive request) and when the network comes back. Nothing
 * is lost if the app is offline or in the background for a while.
 */
import { sendListenEvents } from "@/services/listening.service";
import { useAuthStore } from "@/store/authStore";
import {
  LISTEN_EVENTS_BATCH_SIZE,
  LISTEN_FLUSH_INTERVAL_MS,
  LISTEN_QUEUE_MAX,
  LISTEN_QUEUE_STORAGE_KEY,
} from "@/utils/musicConstants";

let pending = null; // lazily loaded from localStorage
let isFlushing = false;

/** @returns {Object[]} Pending events (loaded once from the browser) */
function getPending() {
  if (pending) return pending;
  try {
    pending = JSON.parse(localStorage.getItem(LISTEN_QUEUE_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(pending)) pending = [];
  } catch {
    pending = [];
  }
  return pending;
}

/** Save pending events (best effort — private mode may block storage). */
function save() {
  try {
    localStorage.setItem(LISTEN_QUEUE_STORAGE_KEY, JSON.stringify(getPending()));
  } catch {
    // Events stay in memory and are still sent while the page is open
  }
}

/**
 * Queue one listening event.
 * @param {Object} event - { sessionId, trackId, kind, … } (see services/listening.service)
 */
export function enqueueListenEvent(event) {
  const events = getPending();
  events.push(event);
  // Never let a long offline period fill the browser: drop the oldest
  if (events.length > LISTEN_QUEUE_MAX) events.splice(0, events.length - LISTEN_QUEUE_MAX);
  save();
}

/**
 * Send queued events in batches.
 * @param {{ keepalive?: boolean }} [options] - keepalive when the page is being hidden
 * @returns {Promise<void>}
 */
export async function flushListenEvents({ keepalive = false } = {}) {
  const events = getPending();
  if (isFlushing || events.length === 0) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  if (useAuthStore.getState().status !== "authenticated") return;

  isFlushing = true;
  try {
    while (events.length > 0) {
      const batch = events.slice(0, LISTEN_EVENTS_BATCH_SIZE);
      try {
        await sendListenEvents(batch, { keepalive });
      } catch (error) {
        // A batch the server will never accept is dropped; anything else is retried later
        if (error?.status === 400) events.splice(0, batch.length);
        save();
        return;
      }
      events.splice(0, batch.length);
      save();
    }
  } finally {
    isFlushing = false;
  }
}

/** Forget unsent events (on log out — they belong to the previous user). */
export function clearListenEvents() {
  pending = [];
  save();
}

/**
 * Start the timers and page listeners. Call once (PlayerEngine).
 * @returns {() => void} Stops everything
 */
export function startListenEventQueue() {
  const flushHidden = () => {
    if (document.visibilityState === "hidden") flushListenEvents({ keepalive: true });
  };
  const flushNow = () => flushListenEvents();
  const timer = setInterval(flushNow, LISTEN_FLUSH_INTERVAL_MS);
  document.addEventListener("visibilitychange", flushHidden);
  window.addEventListener("pagehide", flushHidden);
  window.addEventListener("online", flushNow);
  flushNow(); // events left from a previous visit
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", flushHidden);
    window.removeEventListener("pagehide", flushHidden);
    window.removeEventListener("online", flushNow);
  };
}
