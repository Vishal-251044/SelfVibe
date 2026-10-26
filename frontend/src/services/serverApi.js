/**
 * Read-only calls from the Next.js server to the API (link previews, the
 * landing page's prices). No session; cached for five minutes; any failure
 * returns null so the page falls back to its defaults.
 */
const API_TARGET = (process.env.API_PROXY_TARGET ?? "").replace(/\/$/, "");
const REVALIDATE_SECONDS = 300;
const TIMEOUT_MS = 4000;

/** @returns {string} The API origin the Next.js server talks to */
export function apiTarget() {
  return API_TARGET;
}

/**
 * GET one public API resource.
 * @param {string} path - e.g. "/billing/plans"
 * @returns {Promise<Object|null>} The response `data`, or null on any failure
 */
export async function fetchPublic(path) {
  if (!API_TARGET) return null;
  try {
    const response = await fetch(`${API_TARGET}/api${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body?.data ?? null;
  } catch {
    return null;
  }
}
