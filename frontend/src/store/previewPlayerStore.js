/**
 * Track preview playback (Day 4). One shared <audio> element for the whole
 * app, so starting a track stops the previous one. The full player with queue,
 * mini player and controls replaces this on Day 5.
 *
 * Streams are fetched on demand through a `loadUrl` function (listener stream
 * or staff preview), because signed URLs expire.
 */
import { create } from "zustand";

let audio = null;

/**
 * The shared audio element (created on first use, browser only).
 * @returns {HTMLAudioElement}
 */
function getAudio() {
  if (!audio) {
    audio = new Audio();
    audio.preload = "none";
  }
  return audio;
}

export const usePreviewPlayerStore = create((set, get) => ({
  trackId: null,
  status: "idle", // idle | loading | playing | paused | error
  error: null,
  currentTime: 0,
  duration: 0,

  /**
   * Play a track, or pause / resume when it is already the current one.
   * @param {string} trackId
   * @param {() => Promise<{ url: string, durationSec?: number }>} loadUrl
   * @returns {Promise<void>}
   */
  toggle: async (trackId, loadUrl) => {
    const element = getAudio();
    const { trackId: currentId, status } = get();

    if (currentId === trackId && status === "playing") {
      element.pause();
      return;
    }
    if (currentId === trackId && status === "paused") {
      await element.play().catch(() => set({ status: "error", error: "Couldn't play this track" }));
      return;
    }

    element.pause();
    set({ trackId, status: "loading", error: null, currentTime: 0, duration: 0 });
    try {
      const { url, durationSec } = await loadUrl();
      if (get().trackId !== trackId) return; // another track was started meanwhile
      element.src = url;
      set({ duration: durationSec ?? 0 });
      await element.play();
    } catch (error) {
      if (get().trackId !== trackId) return;
      set({ status: "error", error: error?.message ?? "Couldn't play this track" });
    }
  },

  /** Stop playback completely. */
  stop: () => {
    getAudio().pause();
    set({ trackId: null, status: "idle", currentTime: 0 });
  },
}));

// Mirror the element's state into the store (browser only)
if (typeof window !== "undefined") {
  const element = getAudio();
  const { setState } = usePreviewPlayerStore;
  element.addEventListener("playing", () => setState({ status: "playing" }));
  element.addEventListener("pause", () => {
    if (usePreviewPlayerStore.getState().status === "playing") setState({ status: "paused" });
  });
  element.addEventListener("ended", () =>
    setState({ status: "idle", trackId: null, currentTime: 0 })
  );
  element.addEventListener("timeupdate", () => setState({ currentTime: element.currentTime }));
  element.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(element.duration)) setState({ duration: element.duration });
  });
  element.addEventListener("error", () => {
    if (usePreviewPlayerStore.getState().trackId) {
      setState({ status: "error", error: "This track couldn't be loaded" });
    }
  });
}
