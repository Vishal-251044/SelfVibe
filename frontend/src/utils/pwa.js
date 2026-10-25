/**
 * Small browser checks for the install prompt (PRD PWA-2, roadmap Day 10).
 */

/** @returns {boolean} SelfVibe is running as an installed app (home-screen icon) */
export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.navigator.standalone === true // iPhone Safari
  );
}

/**
 * iPhone / iPad Safari can't show an install dialog; people add the app with
 * Share → "Add to Home Screen", so we show a short guide instead.
 * @returns {boolean}
 */
export function needsIosInstallGuide() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos =
    /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  // Other iOS browsers (Chrome = CriOS, Firefox = FxiOS) also add to home screen only through Safari
  return isIos && !isStandaloneApp();
}

const DISMISS_KEY = "sv-install-dismissed-at";
const DISMISS_DAYS = 14;

/** @returns {boolean} The person said "Not now" recently */
export function wasInstallDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/** Remember "Not now" for two weeks. */
export function rememberInstallDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private mode: the prompt may come back next visit, which is fine
  }
}
