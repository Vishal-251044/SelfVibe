/**
 * Listener / creator session store: current user, loading state, login,
 * register and logout.
 * @example const user = useAuthStore((state) => state.user);
 */
import { createSessionStore } from "@/store/createSessionStore";
import * as authService from "@/services/auth.service";
import { SESSION_HINT_COOKIES } from "@/utils/constants";

export const useAuthStore = createSessionStore({
  scope: "user",
  entityKey: "user",
  hintCookie: SESSION_HINT_COOKIES.user,
  refreshRequest: authService.refreshSession,
  logoutRequest: authService.logout,
  extend: (set, get) => ({
    /**
     * Replace the signed-in user after a profile change or onboarding.
     * @param {Object} user - Public user from the API
     */
    setUser(user) {
      set({ user });
    },

    /**
     * Log in and store the session.
     * @param {{ email: string, password: string }} credentials
     * @returns {Promise<Object>} The signed-in user
     * @throws {import("@/services/api").ApiClientError}
     */
    async login(credentials) {
      const { user, accessToken } = await authService.login(credentials);
      get().setSession(user, accessToken);
      return user;
    },

    /**
     * Create an account and store the session.
     * @param {{ name: string, email: string, password: string }} input
     * @returns {Promise<Object>} The new user
     * @throws {import("@/services/api").ApiClientError}
     */
    async register(input) {
      const { user, accessToken } = await authService.register(input);
      get().setSession(user, accessToken);
      return user;
    },
  }),
});
