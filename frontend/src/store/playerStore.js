/**
 * Global player store (PRD PLY-1/2/3, roadmap Day 5): the queue, current
 * track, shuffle, repeat, volume and what the UI shows. It only holds state —
 * the audio engine (src/lib/player/audioEngine.js) watches it and drives the
 * one shared <audio> element, then reports playback back here.
 *
 * The queue, settings and position in the queue survive a reload (saved in the
 * browser); playback itself always starts paused after a reload.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createId, shuffleArray } from "@/utils/genericFunctions";
import {
  PLAYER_STORAGE_KEY,
  REPEAT_MODES,
  RESTART_THRESHOLD_SECONDS,
} from "@/utils/musicConstants";

/**
 * Keep only what the player needs from a track (small enough to save).
 * @param {Object} track - Public or managed track from the API
 * @returns {Object} Queue item with a unique `qid` (the same song can be queued twice)
 */
export function toQueueItem(track) {
  return {
    qid: createId(),
    id: track.id,
    title: track.title,
    artist: track.artist
      ? {
          id: track.artist.id,
          stageName: track.artist.stageName,
          slug: track.artist.slug ?? null,
          verified: Boolean(track.artist.verified),
        }
      : null,
    coverUrl: track.coverUrl ?? null,
    durationSec: track.durationSec ?? 0,
    waveform: track.waveform ?? [],
    explicit: Boolean(track.explicit),
    catalog: track.catalog ?? null,
  };
}

const INITIAL_PLAYBACK = {
  status: "idle", // idle | loading | playing | paused | error
  currentTime: 0,
  duration: 0,
  error: null,
};

export const usePlayerStore = create(
  persist(
    (set, get) => ({
      /* ----- queue ----- */
      queue: [], // play order (shuffled when shuffle is on)
      unshuffledQueue: [], // original order, restored when shuffle is turned off
      index: -1,
      source: null, // where playback started: "artist", "studio", … (listening events)
      scope: "user", // "user" = listener streams; "staff" = Admin Console previews
      playToken: 0, // bumps whenever a track must (re)load — the engine watches it
      isRepeatPlay: false, // the current load replays the same song (repeat event)
      wantsToPlay: false,

      /* ----- settings ----- */
      shuffle: false,
      repeat: "off",
      volume: 0.9,
      muted: false,
      ducked: false, // not saved: only while the voice mic is open

      /* ----- reported by the engine ----- */
      ...INITIAL_PLAYBACK,
      seekRequest: null, // { time, at } — the engine seeks when this changes

      /* ----- UI ----- */
      isNowPlayingOpen: false,
      isQueueOpen: false,

      /** @returns {Object|null} The queue item being played */
      currentTrack: () => get().queue[get().index] ?? null,

      /**
       * Play a list of tracks, starting at one of them.
       * @param {Object[]} tracks - Tracks from the API (playable ones only)
       * @param {number} [startIndex=0]
       * @param {{ source?: string, scope?: "user"|"staff" }} [options]
       */
      playQueue(tracks, startIndex = 0, { source = null, scope = "user" } = {}) {
        if (tracks.length === 0) return;
        const items = tracks.map(toQueueItem);
        const first = items[Math.min(Math.max(startIndex, 0), items.length - 1)];
        const queue = get().shuffle
          ? [first, ...shuffleArray(items.filter((item) => item !== first))]
          : items;
        set({
          queue,
          unshuffledQueue: items,
          index: queue.indexOf(first),
          source,
          scope,
          playToken: get().playToken + 1,
          isRepeatPlay: false,
          wantsToPlay: true,
          ...INITIAL_PLAYBACK,
          status: "loading",
        });
      },

      /** Play / pause the current track. */
      togglePlay() {
        if (!get().currentTrack()) return;
        set({ wantsToPlay: !get().wantsToPlay });
      },
      play() {
        if (get().currentTrack()) set({ wantsToPlay: true });
      },
      pause() {
        set({ wantsToPlay: false });
      },

      /**
       * Go to the next song.
       * @param {{ auto?: boolean }} [options] - auto = the current song ended by itself
       */
      next({ auto = false } = {}) {
        const { queue, index, repeat, playToken } = get();
        if (queue.length === 0) return;
        if (auto && repeat === "one") {
          set({ playToken: playToken + 1, isRepeatPlay: true, wantsToPlay: true });
          return;
        }
        if (index < queue.length - 1) {
          set({
            index: index + 1,
            playToken: playToken + 1,
            isRepeatPlay: false,
            wantsToPlay: true,
          });
        } else if (repeat === "all") {
          set({
            index: 0,
            playToken: playToken + 1,
            isRepeatPlay: queue.length === 1,
            wantsToPlay: true,
          });
        } else if (auto) {
          // End of the queue: stop on the last song, ready to play again
          set({ wantsToPlay: false, seekRequest: { time: 0, at: Date.now() } });
        }
      },

      /** Previous song — or restart the current one after the first few seconds. */
      previous(restartThresholdSec = RESTART_THRESHOLD_SECONDS) {
        const { queue, index, repeat, currentTime, playToken } = get();
        if (queue.length === 0) return;
        if (currentTime > restartThresholdSec || (index === 0 && repeat !== "all")) {
          set({ seekRequest: { time: 0, at: Date.now() } });
          return;
        }
        set({
          index: index > 0 ? index - 1 : queue.length - 1,
          playToken: playToken + 1,
          isRepeatPlay: false,
          wantsToPlay: true,
        });
      },

      /** @param {number} time - Seconds */
      seek(time) {
        const { duration } = get();
        const clamped = Math.max(0, duration ? Math.min(time, duration) : time);
        set({ seekRequest: { time: clamped, at: Date.now() }, currentTime: clamped });
      },

      /** @param {number} volume - 0–1 */
      setVolume(volume) {
        const clamped = Math.max(0, Math.min(1, volume));
        set({ volume: clamped, muted: clamped === 0 });
      },
      toggleMute() {
        const { muted, volume } = get();
        set({ muted: !muted, volume: muted && volume === 0 ? 0.5 : volume });
      },

      /** Shuffle the songs after the current one, or restore the original order. */
      toggleShuffle() {
        const { shuffle, queue, unshuffledQueue, index } = get();
        const current = queue[index];
        if (!shuffle) {
          const rest = queue.filter((item) => item !== current);
          set({
            shuffle: true,
            queue: current ? [current, ...shuffleArray(rest)] : shuffleArray(rest),
            index: current ? 0 : -1,
          });
        } else {
          const restored = unshuffledQueue.length ? unshuffledQueue : queue;
          set({
            shuffle: false,
            queue: restored,
            index: current ? restored.findIndex((item) => item.qid === current.qid) : -1,
          });
        }
      },

      /** off → all → one → off */
      cycleRepeat() {
        const next = REPEAT_MODES[(REPEAT_MODES.indexOf(get().repeat) + 1) % REPEAT_MODES.length];
        set({ repeat: next });
      },

      /** @param {"off"|"all"|"one"} mode - e.g. from a voice command */
      setRepeat(mode) {
        if (REPEAT_MODES.includes(mode)) set({ repeat: mode });
      },

      /** @param {boolean} isOn */
      setShuffle(isOn) {
        if (get().shuffle !== isOn) get().toggleShuffle();
      },

      /** @param {boolean} isDucked - lower the music while the mic listens (PRD VOC-8) */
      setDucked(isDucked) {
        set({ ducked: isDucked });
      },

      /**
       * Put a track right after the current one (PRD PLY-3 "play next").
       * @param {Object} track
       */
      playNext(track) {
        const { queue, unshuffledQueue, index } = get();
        if (queue.length === 0) return get().playQueue([track], 0, { source: "queue" });
        const item = toQueueItem(track);
        const current = queue[index];
        const originalIndex = unshuffledQueue.findIndex((entry) => entry.qid === current?.qid);
        set({
          queue: [...queue.slice(0, index + 1), item, ...queue.slice(index + 1)],
          unshuffledQueue: [
            ...unshuffledQueue.slice(0, originalIndex + 1),
            item,
            ...unshuffledQueue.slice(originalIndex + 1),
          ],
        });
        return undefined;
      },

      /**
       * Add a track to the end of the queue (PRD PLY-3 "add to queue").
       * @param {Object} track
       */
      addToQueue(track) {
        const { queue, unshuffledQueue } = get();
        if (queue.length === 0) return get().playQueue([track], 0, { source: "queue" });
        const item = toQueueItem(track);
        set({ queue: [...queue, item], unshuffledQueue: [...unshuffledQueue, item] });
        return undefined;
      },

      /**
       * Remove one queue item. Removing the current song moves on to the next one.
       * @param {string} qid
       */
      removeFromQueue(qid) {
        const { queue, unshuffledQueue, index, playToken, wantsToPlay } = get();
        const position = queue.findIndex((item) => item.qid === qid);
        if (position === -1) return;
        const remaining = queue.filter((item) => item.qid !== qid);
        const original = unshuffledQueue.filter((item) => item.qid !== qid);
        if (remaining.length === 0) {
          get().clear();
          return;
        }
        if (position === index) {
          set({
            queue: remaining,
            unshuffledQueue: original,
            index: Math.min(index, remaining.length - 1),
            playToken: playToken + 1,
            isRepeatPlay: false,
            wantsToPlay,
          });
        } else {
          set({
            queue: remaining,
            unshuffledQueue: original,
            index: position < index ? index - 1 : index,
          });
        }
      },

      /**
       * New order for the songs after the current one (drag to reorder).
       * @param {Object[]} upcoming - The same items, reordered
       */
      reorderUpcoming(upcoming) {
        const { queue, index } = get();
        set({ queue: [...queue.slice(0, index + 1), ...upcoming] });
      },

      /** @param {string} qid - Jump to this queue item and play it */
      jumpTo(qid) {
        const position = get().queue.findIndex((item) => item.qid === qid);
        if (position === -1) return;
        set({
          index: position,
          playToken: get().playToken + 1,
          isRepeatPlay: false,
          wantsToPlay: true,
        });
      },

      /** Stop and empty the queue (also used on log out). */
      clear() {
        set({
          queue: [],
          unshuffledQueue: [],
          index: -1,
          source: null,
          wantsToPlay: false,
          isNowPlayingOpen: false,
          isQueueOpen: false,
          playToken: get().playToken + 1,
          ...INITIAL_PLAYBACK,
        });
      },

      setNowPlayingOpen(isOpen) {
        set({ isNowPlayingOpen: isOpen, ...(isOpen ? {} : { isQueueOpen: false }) });
      },
      setQueueOpen(isOpen) {
        set({ isQueueOpen: isOpen });
      },

      /**
       * Playback state reported by the audio engine.
       * @param {Partial<typeof INITIAL_PLAYBACK>} playback
       */
      report(playback) {
        set(playback);
      },
    }),
    {
      name: PLAYER_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // hydrated by PlayerEngine after mount (no server/client mismatch)
      // Staff previews are never saved; listener queues come back after a reload, paused
      partialize: (state) => ({
        queue: state.scope === "user" ? state.queue : [],
        unshuffledQueue: state.scope === "user" ? state.unshuffledQueue : [],
        index: state.scope === "user" ? state.index : -1,
        source: state.source,
        shuffle: state.shuffle,
        repeat: state.repeat,
        volume: state.volume,
        muted: state.muted,
      }),
    }
  )
);
