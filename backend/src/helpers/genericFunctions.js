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
 * Short, human-readable device name from a User-Agent header, for security
 * emails and the Team page (e.g. "Chrome on Android"). Not used for any check.
 * @param {string|undefined} userAgent
 * @returns {string}
 */
export function describeUserAgent(userAgent = "") {
  const ua = String(userAgent);
  // Order matters: Edge and Opera also say "Chrome"; Chrome also says "Safari"
  const browser =
    [
      [/Edg\//, "Edge"],
      [/OPR\/|Opera/, "Opera"],
      [/SamsungBrowser/, "Samsung Internet"],
      [/Firefox\/|FxiOS/, "Firefox"],
      [/Chrome\/|CriOS/, "Chrome"],
      [/Safari\//, "Safari"],
    ].find(([pattern]) => pattern.test(ua))?.[1] ?? "Unknown browser";
  const os =
    [
      [/Android/, "Android"],
      [/iPhone|iPad|iPod/, "iOS"],
      [/Windows/, "Windows"],
      [/Mac OS X|Macintosh/, "macOS"],
      [/CrOS/, "ChromeOS"],
      [/Linux/, "Linux"],
    ].find(([pattern]) => pattern.test(ua))?.[1] ?? "unknown system";
  return `${browser} on ${os}`;
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

/**
 * Build CSV text (RFC 4180: quotes doubled, fields with , " or newlines quoted).
 * Cells starting with = + - @ are prefixed with ' so spreadsheets don't run them.
 * @param {Array<Object>} rows
 * @param {Array<{ key: string, label: string }>} columns
 * @returns {string}
 */
export function toCsv(rows, columns) {
  const cell = (value) => {
    if (value === null || value === undefined) return "";
    let text = value instanceof Date ? value.toISOString() : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = columns.map((column) => cell(column.label)).join(",");
  const lines = rows.map((row) => columns.map((column) => cell(row[column.key])).join(","));
  return [header, ...lines].join("\r\n");
}

/**
 * Case-insensitive "contains" regex for a search box, with the text escaped.
 * @param {string} text - What the person typed
 * @returns {RegExp}
 */
export function containsRegex(text) {
  return new RegExp(String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/**
 * Human-readable size, e.g. 1536 → "1.5 KB", 6291456 → "6.0 MB".
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, Number(bytes) || 0);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${value} B` : `${value.toFixed(1)} ${units[unit]}`;
}
