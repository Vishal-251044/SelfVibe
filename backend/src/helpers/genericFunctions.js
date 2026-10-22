/**
 * Generic, stateless helpers shared across the backend.
 * Check here before writing a new helper.
 */

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Parse pagination params from a query string.
 * @param {Object} query - req.query
 * @param {string|number} [query.page] - 1-based page number
 * @param {string|number} [query.limit] - Items per page (capped at 100)
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function getPagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requestedLimit = Number.parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Build pagination metadata for list responses.
 * @param {number} total - Total matching documents
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {{ total: number, page: number, limit: number, totalPages: number, hasNext: boolean }}
 */
export function buildPageMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { total, page, limit, totalPages, hasNext: page < totalPages };
}

/**
 * Convert text to a URL-safe slug.
 * @param {string} text - e.g. "Lo-fi Beats & Chill"
 * @returns {string} e.g. "lo-fi-beats-chill"
 */
export function slugify(text = "") {
  return text
    .toString()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Device info stored with a session (shown later in "signed-in devices").
 * @param {import("express").Request} req
 * @returns {{ userAgent: string|undefined, ip: string }}
 */
export function getRequestMeta(req) {
  return { userAgent: req.get("user-agent"), ip: req.ip };
}

/**
 * Only allow redirects to paths on our own site (blocks open redirects via ?next=).
 * @param {unknown} target - e.g. "/library"
 * @param {string|null} [fallback=null]
 * @returns {string|null} A safe internal path, or the fallback
 */
export function getSafeRedirectPath(target, fallback = null) {
  if (typeof target !== "string" || target.length > 512) return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\")) return fallback;
  return target;
}
