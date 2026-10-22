/**
 * Base API client for the SelfVibe backend.
 * A thin fetch wrapper that:
 * - calls the API through the same-origin `/api` proxy (see next.config.mjs),
 *   so the httpOnly refresh cookie is first-party on every browser
 * - attaches the in-memory access token (listener or staff session)
 * - on a 401, refreshes the session once and retries the request
 * - parses the standard `{ success, message, data | error }` envelope and
 *   throws ApiClientError on failure
 * Components never call fetch directly — they use the feature services.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_TIMEOUT_MS = 15000;

/** Error thrown for any failed request (network, timeout or non-2xx response). */
export class ApiClientError extends Error {
  /**
   * @param {string} message - Human-readable message (from the API when available)
   * @param {number} status - HTTP status, or 0 for network/timeout errors
   * @param {Object|null} [details] - The `error` payload from the API, e.g. { code, fields }
   */
  constructor(message, status, details = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }

  /** @returns {string|undefined} Machine-readable error code from the API */
  get code() {
    return this.details?.code;
  }
}

/**
 * Session hooks registered by the auth stores (keeps this file free of store imports).
 * @type {Record<"user"|"staff", { getAccessToken: () => string|null, refresh: () => Promise<string|null> } | undefined>}
 */
const authBridges = { user: undefined, staff: undefined };

/**
 * Connect a session store to the API client.
 * @param {"user"|"staff"} scope
 * @param {{ getAccessToken: Function, refresh: Function }} bridge
 */
export function registerAuthBridge(scope, bridge) {
  authBridges[scope] = bridge;
}

/**
 * Build the request URL. A relative base (e.g. "/api") resolves against the
 * current origin.
 * @param {string} path - API path, e.g. "/health"
 * @param {Object} [query] - Query params; undefined/null values are skipped
 * @returns {string}
 */
function buildUrl(path, query) {
  if (!API_URL) {
    throw new ApiClientError("NEXT_PUBLIC_API_URL is not set. Add it to frontend/.env.local.", 0);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(`${API_URL.replace(/\/$/, "")}${path}`, origin);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

/**
 * Message for failures without an API error body. A 5xx without our JSON
 * envelope means the Next.js /api proxy could not reach the backend at all.
 * @param {number} status
 * @returns {string}
 */
function fallbackMessage(status) {
  if (status >= 500)
    return "Can't reach the SelfVibe server right now. Please try again in a moment.";
  if (status === 404) return "That isn't available.";
  return "Something went wrong. Please try again.";
}

/**
 * Which session a request belongs to: console routes use the staff session.
 * @param {string} path
 * @param {"user"|"staff"|"none"|undefined} auth - Explicit choice from the caller
 * @returns {"user"|"staff"|"none"}
 */
function resolveAuthScope(path, auth) {
  if (auth) return auth;
  return path.startsWith("/admin") ? "staff" : "user";
}

/**
 * Send a request to the backend.
 * @param {string} path - API path, e.g. "/users/me"
 * @param {Object} [options]
 * @param {string} [options.method="GET"] - HTTP method
 * @param {Object} [options.body] - JSON body (serialised automatically)
 * @param {Object} [options.query] - Query string params
 * @param {Object} [options.headers] - Extra headers
 * @param {"user"|"staff"|"none"} [options.auth] - Session to use; "none" for login/refresh calls
 * @param {AbortSignal} [options.signal] - Caller abort signal (e.g. from React Query)
 * @param {number} [options.timeoutMs] - Request timeout in ms
 * @returns {Promise<any>} The `data` field of the API response
 * @throws {ApiClientError} On network error, timeout or non-2xx response
 */
export async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    query,
    headers,
    auth,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    isRetry = false,
  } = options;

  const scope = resolveAuthScope(path, auth);
  const bridge = scope === "none" ? undefined : authBridges[scope];
  const accessToken = bridge?.getAccessToken();

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
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: combinedSignal,
    });
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new ApiClientError("The server took too long to respond. Please try again.", 0);
    }
    if (error.name === "AbortError") throw error; // let React Query handle cancellation
    throw new ApiClientError("Can't reach SelfVibe. Check your connection and try again.", 0);
  }

  // 204 No Content has no body to parse
  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    // Expired / missing access token: refresh the session once, then retry.
    // (If the refresh is rejected, the session store signs the user out itself.)
    if (response.status === 401 && bridge && !isRetry) {
      const newToken = await bridge.refresh();
      if (newToken) return request(path, { ...options, isRetry: true });
    }

    throw new ApiClientError(
      payload?.message ?? fallbackMessage(response.status),
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
