/**
 * Factory for a session store (Zustand). Shared by the listener session
 * (authStore) and the staff console session (staffAuthStore).
 *
 * The access token lives only in memory (never localStorage), so a page reload
 * restores the session by exchanging the httpOnly refresh cookie (bootstrap).
 *
 * Only a real "session is over" answer from the API (401 / 403) signs the user
 * out. Network errors or an aborted request (page reload) keep the session, so
 * a flaky connection never logs anyone out.
 */
import { create } from "zustand";
import { registerAuthBridge } from "@/services/api";
import { deleteCookie, hasCookie } from "@/utils/genericFunctions";

/**
 * Whether an error means the session is definitely over.
 * @param {any} error
 * @returns {boolean}
 */
function isSessionRejected(error) {
  return error?.status === 401 || error?.status === 403;
}

/**
 * @param {Object} config
 * @param {"user"|"staff"} config.scope - Which API session this store owns
 * @param {"user"|"staff"} config.entityKey - State key for the signed-in person
 * @param {string} config.hintCookie - Cookie that says a session probably exists
 * @param {() => Promise<Object>} config.refreshRequest - Calls the refresh endpoint
 * @param {() => Promise<any>} config.logoutRequest - Calls the logout endpoint
 * @param {(set: Function, get: Function) => Object} [config.extend] - Extra actions
 * @returns {import("zustand").UseBoundStore} The store hook
 */
export function createSessionStore({
  scope,
  entityKey,
  hintCookie,
  refreshRequest,
  logoutRequest,
  extend = () => ({}),
}) {
  let refreshInFlight = null; // shared by every caller so only one refresh runs

  const useStore = create((set, get) => ({
    /**
     * "idle" → not checked yet · "loading" · "authenticated" · "unauthenticated"
     * · "error" (could not reach the API while restoring the session)
     */
    status: "idle",
    [entityKey]: null,
    accessToken: null,

    /**
     * Save a session returned by login / refresh.
     * @param {Object} entity - The user or staff member
     * @param {string} accessToken
     */
    setSession(entity, accessToken) {
      set({ status: "authenticated", [entityKey]: entity, accessToken });
    },

    /** Forget the session locally (the API clears the httpOnly cookie itself). */
    clearSession() {
      deleteCookie(hintCookie);
      set({ status: "unauthenticated", [entityKey]: null, accessToken: null });
    },

    /**
     * Restore the session on page load. Skips the network call entirely when
     * the hint cookie says there is no session.
     * @returns {Promise<void>}
     */
    async bootstrap() {
      if (get().status !== "idle") return;
      if (!hasCookie(hintCookie)) {
        set({ status: "unauthenticated" });
        return;
      }
      set({ status: "loading" });
      await get().refresh();
    },

    /**
     * Try restoring the session again after an "error" (e.g. offline).
     * @returns {Promise<void>}
     */
    async retryBootstrap() {
      set({ status: "idle" });
      await get().bootstrap();
    },

    /**
     * Get a fresh access token from the refresh cookie (single-flight).
     * @returns {Promise<string|null>} The new token, or null if it could not be refreshed
     */
    refresh() {
      refreshInFlight ??= (async () => {
        try {
          const result = await refreshRequest();
          get().setSession(result[entityKey], result.accessToken);
          return result.accessToken;
        } catch (error) {
          if (isSessionRejected(error)) {
            get().clearSession();
          } else if (error?.name !== "AbortError" && get().status !== "authenticated") {
            set({ status: "error" }); // could not reach the API while restoring
          }
          return null;
        } finally {
          refreshInFlight = null;
        }
      })();
      return refreshInFlight;
    },

    /**
     * Sign out on the server and locally. Never throws.
     * @returns {Promise<void>}
     */
    async logout() {
      try {
        await logoutRequest();
      } catch {
        // The local session is cleared either way
      }
      get().clearSession();
    },

    ...extend(set, get),
  }));

  // Let the API client attach this session's token and refresh it on 401
  registerAuthBridge(scope, {
    getAccessToken: () => useStore.getState().accessToken,
    refresh: () => useStore.getState().refresh(),
  });

  return useStore;
}
