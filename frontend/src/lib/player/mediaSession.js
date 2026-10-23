/**
 * Media Session API (PRD PLY-6, BGP-2/3): lock-screen, notification,
 * headphone, Bluetooth and car controls with artwork, title, artist and a
 * seek bar. Every call is a safe no-op on browsers without the API.
 */
const hasMediaSession = () => typeof navigator !== "undefined" && "mediaSession" in navigator;
const FALLBACK_ARTWORK = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
];

/**
 * Show the current song on the lock screen / notification.
 * @param {{ title: string, artist?: { stageName: string }|null, coverUrl?: string|null }|null} track
 */
export function setMediaMetadata(track) {
  if (!hasMediaSession()) return;
  if (!track) {
    navigator.mediaSession.metadata = null;
    return;
  }
  const coverUrl = track.coverUrl
    ? new URL(track.coverUrl, window.location.origin).toString()
    : null;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist?.stageName ?? "SelfVibe",
    album: "SelfVibe",
    artwork: coverUrl
      ? ["96x96", "192x192", "512x512"].map((sizes) => ({
          src: coverUrl,
          sizes,
          type: "image/webp",
        }))
      : FALLBACK_ARTWORK,
  });
}

/** @param {"playing"|"paused"|"none"} state */
export function setMediaPlaybackState(state) {
  if (hasMediaSession()) navigator.mediaSession.playbackState = state;
}

/**
 * Keep the lock-screen seek bar in sync.
 * @param {{ duration: number, position: number }} state
 */
export function setMediaPosition({ duration, position }) {
  if (!hasMediaSession() || !navigator.mediaSession.setPositionState) return;
  if (!Number.isFinite(duration) || duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration,
      position: Math.min(Math.max(position, 0), duration),
      playbackRate: 1,
    });
  } catch {
    // Some browsers reject updates while metadata is loading
  }
}

/**
 * Connect lock-screen / headset buttons to the player.
 * @param {{ play: Function, pause: Function, next: Function, previous: Function, seekTo: (time: number) => void, seekBy: (delta: number) => void, stop: Function }} handlers
 */
export function bindMediaSessionActions(handlers) {
  if (!hasMediaSession()) return;
  const actions = {
    play: () => handlers.play(),
    pause: () => handlers.pause(),
    stop: () => handlers.stop(),
    nexttrack: () => handlers.next(),
    previoustrack: () => handlers.previous(),
    seekto: (details) => handlers.seekTo(details.seekTime ?? 0),
    seekforward: (details) => handlers.seekBy(details.seekOffset ?? 10),
    seekbackward: (details) => handlers.seekBy(-(details.seekOffset ?? 10)),
  };
  Object.entries(actions).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Action not supported by this browser
    }
  });
}
