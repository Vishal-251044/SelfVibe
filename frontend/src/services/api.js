/**
 * Base API client for the SelfVibe backend.
 * A thin fetch wrapper that adds the base URL, sends cookies (for the httpOnly
 * refresh token arriving on Day 2), parses the standard
 * `{ success, message, data | error }` envelope, and throws ApiClientError on
 * failure. Components never call fetch directly — they use the feature
 * services in this folder.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_TIMEOUT_MS = 15000;

/** Error thrown for any failed request (network, timeout or non-2xx response). */
export class ApiClientError extends Error {
  /**
   * @param {string} message - Human-readable message (from the API when available)
   * @param {number} status - HTTP status, or 0 for network/timeout errors
   * @param {Object|null} [details] - The `error` payload from the API, if any
   */
  constructor(message, status, details = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Build a full URL from a path and optional query params.
 * @param {string} path - API path, e.g. "/health"
 * @param {Object} [query] - Query params; undefined/null values are skipped
 * @returns {string} The absolute URL
 */
function buildUrl(path, query) {
  if (!API_URL) {
    throw new ApiClientError("NEXT_PUBLIC_API_URL is not set. Add it to frontend/.env.local.", 0);
  }

  const url = new URL(`${API_URL.replace(/\/$/, "")}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

/**
 * Send a request to the backend.
 * @param {string} path - API path, e.g. "/health"
 * @param {Object} [options]
 * @param {string} [options.method="GET"] - HTTP method
 * @param {Object} [options.body] - JSON body (serialised automatically)
 * @param {Object} [options.query] - Query string params
 * @param {Object} [options.headers] - Extra headers
 * @param {AbortSignal} [options.signal] - Caller abort signal (e.g. from React Query)
 * @param {number} [options.timeoutMs] - Request timeout in ms
 * @returns {Promise<any>} The `data` field of the API response
 * @throws {ApiClientError} On network error, timeout or non-2xx response
 */
export async function request(path, options = {}) {
  const { method = "GET", body, query, headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // Combine the caller's signal with our timeout so either can cancel the request
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: combinedSignal,
    });
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new ApiClientError(`Request to ${path} timed out`, 0);
    }
    if (error.name === "AbortError") throw error; // let React Query handle cancellation
    throw new ApiClientError(`Network error while calling ${path}`, 0);
  }

  // 204 No Content has no body to parse
  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new ApiClientError(
      payload?.message ?? `Request to ${path} failed with status ${response.status}`,
      response.status,
      payload?.error ?? null
    );
  }

  return payload?.data ?? null;
}

/** Shorthand helpers for each HTTP method. */
export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};
