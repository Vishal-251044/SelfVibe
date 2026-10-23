/**
 * Audio engine (roadmap Day 5, PRD PLY-1/4/6, BGP-1–6): drives the ONE shared
 * <audio> element of the app from the player store, and reports playback back.
 *
 * - The element is created once in the root layout and never recreated, so
 *   music keeps playing across pages and in the background (BGP-6, iOS).
 * - Songs stream over HTTP range requests (the browser seeks with 206s).
 * - The next song's URL is fetched early and its first bytes are preloaded
 *   by a second, silent element, so the queue continues without gaps while
 *   the screen is locked (BGP-5).
 * - Lock-screen / headset controls go through the Media Session API.
 * - Pauses coming from the system (a call, headphones unplugged) are mirrored
 *   into the store, so "play" afterwards resumes correctly (BGP-4).
 * - A Web Audio analyser for the visualiser is only created on desktop
 *   browsers: on phones (especially iOS) routing audio through Web Audio can
 *   stop playback when the screen locks.
 */
import { usePlayerStore } from "@/store/playerStore";
import { getStreamUrl, invalidateStreamUrl, prefetchStreamUrls } from "@/lib/player/streamUrlCache";
import {
  beginListen,
  endListen,
  markListenPlaying,
  trackListenProgress,
} from "@/lib/player/listenTracker";
import {
  bindMediaSessionActions,
  setMediaMetadata,
  setMediaPlaybackState,
  setMediaPosition,
} from "@/lib/player/mediaSession";
import { PRELOAD_BEFORE_END_SECONDS, RESTART_THRESHOLD_SECONDS } from "@/utils/musicConstants";

const UPCOMING_PREFETCH_COUNT = 5;
const REPORT_EVERY_MS = 250;
const POSITION_STATE_EVERY_MS = 1000;
const SKIP_AFTER_ERROR_MS = 2000;

let audio = null;
let preloader = null;
let currentToken = -1;
let retriedToken = -1;
let preloadedTrackId = null;
let lastReportAt = 0;
let lastPositionStateAt = 0;
let audioOutputCount = null;
let analyser = null;

/** @returns {ReturnType<typeof usePlayerStore.getState>} */
const store = () => usePlayerStore.getState();

/** Whether this browser should get the live Web Audio visualiser. */
export function canUseWebAudio() {
  if (typeof window === "undefined" || !window.AudioContext) return false;
  const isIOS =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return !isIOS && window.matchMedia("(pointer: fine)").matches;
}

/**
 * The analyser node for the visualiser (created on first use, desktop only).
 * @returns {AnalyserNode|null}
 */
export function getAnalyser() {
  if (!audio || !canUseWebAudio()) return null;
  if (!analyser) {
    try {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audio);
      analyser = context.createAnalyser();
      analyser.fftSize = 256; // 128 frequency bins — enough detail in the bass and mids
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(context.destination);
    } catch {
      analyser = null;
      return null;
    }
  }
  if (analyser.context.state === "suspended") analyser.context.resume().catch(() => {});
  return analyser;
}

/** The song after the current one, following repeat-all. */
function nextQueueItem() {
  const { queue, index, repeat } = store();
  if (index < queue.length - 1) return queue[index + 1];
  return repeat === "all" ? queue[0] : null;
}

/** Fetch URLs for the next few songs in one request. */
function prefetchUpcoming() {
  const { queue, index, scope } = store();
  const upcoming = queue
    .slice(index + 1, index + 1 + UPCOMING_PREFETCH_COUNT)
    .map((item) => item.id);
  if (upcoming.length) prefetchStreamUrls(upcoming, scope).catch(() => {});
}

/** Start playing, mirroring "not allowed" (no user gesture yet) into the store. */
function playAudio() {
  audio.play().catch((error) => {
    // AbortError = a newer song replaced this one before it started; nothing to do
    if (error?.name !== "NotAllowedError") return;
    store().report({ status: "paused" });
    usePlayerStore.setState({ wantsToPlay: false });
  });
}

/** Load the store's current track into the audio element. */
async function loadCurrent() {
  const state = store();
  const token = state.playToken;
  currentToken = token;
  const track = state.currentTrack();
  endListen(); // the previous song (if any) ends here

  if (!track) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setMediaMetadata(null);
    setMediaPlaybackState("none");
    return;
  }

  state.report({
    status: "loading",
    currentTime: 0,
    duration: track.durationSec || 0,
    error: null,
  });
  setMediaMetadata(track);
  beginListen(track, {
    repeat: state.isRepeatPlay,
    source: state.source,
    enabled: state.scope === "user",
  });

  let url = null;
  try {
    url = await getStreamUrl(track.id, state.scope);
  } catch {
    url = null;
  }
  if (token !== currentToken) return; // another song was chosen meanwhile
  if (!url) {
    handleUnplayable("This song isn't available right now");
    return;
  }

  audio.src = url;
  audio.currentTime = 0;
  preloadedTrackId = null;
  if (store().wantsToPlay) playAudio();
  prefetchUpcoming();
}

/**
 * Show an error and move on to the next song (if there is one).
 * @param {string} message
 */
function handleUnplayable(message) {
  const token = currentToken;
  store().report({ status: "error", error: message });
  if (nextQueueItem()) {
    setTimeout(() => {
      if (token === currentToken) store().next({ auto: true });
    }, SKIP_AFTER_ERROR_MS);
  }
}

/** Warm up the next song shortly before the current one ends (BGP-5). */
async function preloadNextIfNeeded() {
  const { duration, currentTime } = { duration: audio.duration, currentTime: audio.currentTime };
  if (!Number.isFinite(duration) || duration - currentTime > PRELOAD_BEFORE_END_SECONDS) return;
  const nextItem = nextQueueItem();
  if (!nextItem || preloadedTrackId === nextItem.id) return;
  preloadedTrackId = nextItem.id;
  const url = await getStreamUrl(nextItem.id, store().scope).catch(() => null);
  if (url && preloader) {
    preloader.src = url;
    preloader.load();
  }
}

/** Wire the <audio> element's events to the store. */
function bindAudioEvents() {
  audio.addEventListener("playing", () => {
    store().report({ status: "playing", error: null });
    if (!store().wantsToPlay) usePlayerStore.setState({ wantsToPlay: true }); // started from lock screen
    markListenPlaying();
    setMediaPlaybackState("playing");
  });
  audio.addEventListener("pause", () => {
    if (audio.ended) return;
    store().report({ status: "paused" });
    // A pause we didn't ask for (call, headphones unplugged, OS) — remember it,
    // so pressing play afterwards resumes from here (BGP-4)
    if (store().wantsToPlay) usePlayerStore.setState({ wantsToPlay: false });
    setMediaPlaybackState("paused");
  });
  audio.addEventListener("waiting", () => store().report({ status: "loading" }));
  audio.addEventListener("durationchange", () => {
    if (Number.isFinite(audio.duration)) store().report({ duration: audio.duration });
  });
  audio.addEventListener("timeupdate", () => {
    const now = Date.now();
    trackListenProgress(audio.currentTime, !audio.paused, audio.duration);
    if (now - lastReportAt >= REPORT_EVERY_MS) {
      lastReportAt = now;
      store().report({ currentTime: audio.currentTime });
    }
    if (now - lastPositionStateAt >= POSITION_STATE_EVERY_MS) {
      lastPositionStateAt = now;
      setMediaPosition({ duration: audio.duration, position: audio.currentTime });
    }
    preloadNextIfNeeded();
  });
  audio.addEventListener("ended", () => {
    endListen();
    store().next({ auto: true });
  });
  audio.addEventListener("error", async () => {
    if (!audio.getAttribute("src")) return;
    const token = currentToken;
    const track = store().currentTrack();
    // An expired / revoked URL: get a fresh one once and continue where we were
    if (track && retriedToken !== token) {
      retriedToken = token;
      const resumeAt = audio.currentTime;
      invalidateStreamUrl(track.id);
      const url = await getStreamUrl(track.id, store().scope).catch(() => null);
      if (token !== currentToken) return;
      if (url) {
        audio.src = url;
        audio.currentTime = resumeAt;
        if (store().wantsToPlay) playAudio();
        return;
      }
    }
    handleUnplayable("This song couldn't be played");
  });
}

/** Pause when an audio output disappears (headphones unplugged on desktop). */
async function watchOutputDevices() {
  const devices = navigator.mediaDevices;
  if (!devices?.enumerateDevices) return;
  const countOutputs = async () =>
    (await devices.enumerateDevices()).filter((device) => device.kind === "audiooutput").length;
  audioOutputCount = await countOutputs().catch(() => null);
  devices.addEventListener?.("devicechange", async () => {
    const count = await countOutputs().catch(() => null);
    if (count !== null && audioOutputCount !== null && count < audioOutputCount && !audio.paused) {
      store().pause();
    }
    audioOutputCount = count;
  });
}

/**
 * Start the engine with the app's shared <audio> element. Safe to call twice.
 * @param {HTMLAudioElement} element
 * @returns {() => void} Cleanup (unsubscribes from the store)
 */
export function initAudioEngine(element) {
  if (audio === element) return () => {};
  audio = element;
  audio.preload = "auto";
  if (canUseWebAudio()) audio.crossOrigin = "anonymous"; // needed for the analyser
  preloader = new Audio();
  preloader.preload = "auto";
  preloader.muted = true;

  bindAudioEvents();
  watchOutputDevices();
  bindMediaSessionActions({
    play: () => store().play(),
    pause: () => store().pause(),
    stop: () => store().pause(),
    next: () => store().next(),
    previous: () => store().previous(RESTART_THRESHOLD_SECONDS),
    seekTo: (time) => store().seek(time),
    seekBy: (delta) => store().seek(audio.currentTime + delta),
  });

  // Apply the restored volume and show the restored song (paused)
  const initial = store();
  audio.volume = initial.volume;
  audio.muted = initial.muted;

  const unsubscribe = usePlayerStore.subscribe((state, previous) => {
    if (state.playToken !== previous.playToken) {
      loadCurrent();
      return;
    }
    if (state.wantsToPlay !== previous.wantsToPlay) {
      if (state.wantsToPlay) {
        if (!audio.getAttribute("src")) loadCurrent();
        else playAudio();
      } else if (!audio.paused) {
        audio.pause();
      }
    }
    if (state.volume !== previous.volume) audio.volume = state.volume;
    if (state.muted !== previous.muted) audio.muted = state.muted;
    if (state.seekRequest && state.seekRequest !== previous.seekRequest) {
      audio.currentTime = state.seekRequest.time;
      trackListenProgress(state.seekRequest.time, false); // a seek isn't listening time
    }
    if (state.queue !== previous.queue) prefetchUpcoming();
  });

  return () => {
    unsubscribe();
  };
}

/** Stop everything (log out). */
export function resetAudioEngine() {
  endListen();
  store().clear();
}
