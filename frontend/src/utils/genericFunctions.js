/**
 * Generic, stateless helpers shared across the frontend.
 * Check here before writing a new helper.
 */
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, resolving Tailwind conflicts (last one wins).
 * @param {...any} inputs - Class names, arrays or conditional objects
 * @returns {string} The merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a duration in seconds as m:ss (or h:mm:ss for long tracks).
 * @param {number} totalSeconds - Duration in seconds
 * @returns {string} e.g. "3:45" or "1:02:09"; "0:00" for invalid input
 */
export function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";

  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (n) => String(n).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * Format a plan price in Indian rupees.
 * @param {number} amount - Price in rupees
 * @returns {string} e.g. "₹99"
 */
export function formatPrice(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Whether a nav item should show as active for the current path.
 * @param {string} pathname - Current path, e.g. "/playlist/42"
 * @param {string} href - Nav item path, e.g. "/library"
 * @returns {boolean} True when the path is the item or one of its sub-routes
 */
export function isNavActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Up to two initials for an avatar placeholder.
 * @param {string} [name] - e.g. "Vishal Chavan"
 * @returns {string} e.g. "VC"; "?" when there is no name
 */
export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts.at(-1)[0];
  return initials.toUpperCase();
}

/**
 * Only allow redirects to paths on this site (blocks open-redirect attacks via ?next=).
 * @param {string|null|undefined} target - e.g. "/library"
 * @param {string} [fallback="/home"]
 * @returns {string} A safe internal path
 */
export function getSafeRedirect(target, fallback = "/home") {
  if (typeof target !== "string" || !target.startsWith("/") || target.startsWith("//")) {
    return fallback;
  }
  if (target.includes("\\") || /^\/(login|signup)(\/|$|\?)/.test(target)) return fallback;
  return target;
}

/**
 * Where to send a user right after they sign in: the taste quiz first if they
 * have not done it (PRD ONB-1), otherwise ?next= or /home.
 * @param {{ onboardingDone: boolean }} user
 * @param {string|null} next - Requested destination
 * @returns {string} A safe internal path
 */
export function getPostAuthRedirect(user, next) {
  const destination = getSafeRedirect(next);
  if (user?.onboardingDone) return destination;
  return destination === "/home"
    ? "/onboarding"
    : `/onboarding?next=${encodeURIComponent(destination)}`;
}

/**
 * Whether a (non-httpOnly) cookie exists in the browser.
 * @param {string} name
 * @returns {boolean} Always false during server rendering
 */
export function hasCookie(name) {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((entry) => entry.startsWith(`${name}=`));
}

/**
 * Delete a (non-httpOnly) cookie set on path "/".
 * @param {string} name
 */
export function deleteCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/**
 * Wait for a number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Human-readable file size, e.g. 4404019 → "4.2 MB".
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Shuffled copy of an array (Fisher–Yates).
 * @template T
 * @param {T[]} items
 * @returns {T[]}
 */
export function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Random id for client-side records (queue items, listening sessions).
 * @returns {string}
 */
export function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * URL-safe slug, e.g. "Chai at 2AM!" → "chai-at-2am".
 * @param {string} [text]
 * @returns {string}
 */
export function slugify(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
