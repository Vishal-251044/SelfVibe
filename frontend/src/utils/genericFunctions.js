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
