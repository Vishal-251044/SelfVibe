/**
 * Listener / creator session store: current user, loading state, login,
 * register and logout.
 * @example const user = useAuthStore((state) => state.user);
 */
import { createSessionStore } from "@/store/createSessionStore";
import * as authService from "@/services/auth.service";
import { logoutStaff } from "@/services/adminAuth.service";
import { SESSION_HINT_COOKIES } from "@/utils/constants";
import { deleteCookie, hasCookie } from "@/utils/genericFunctions";

export const useAuthStore = createSessionStore({
  scope: "user",
  entityKey: "user",
  hintCookie: SESSION_HINT_COOKIES.user,
  refreshRequest: authService.refreshSession,
  logoutRequest: authService.logout,
  extend: (set, get) => ({
    /**
     * Log out of the app, and out of the console too (staff use one login). Never throws.
     * @returns {Promise<void>}
     */
    async logout() {
      await Promise.allSettled([
        authService.logout(),
        hasCookie(SESSION_HINT_COOKIES.staff) ? logoutStaff() : Promise.resolve(),
      ]);
      deleteCookie(SESSION_HINT_COOKIES.staff);
      get().clearSession();
    },

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
