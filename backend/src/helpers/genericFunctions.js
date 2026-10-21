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
