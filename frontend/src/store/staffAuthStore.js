/**
 * Staff console session store. The console keeps its own short session
 * (PRD ADL-4), but it is opened from the app login: staff sign in once at
 * /login (email or Google) and the console uses that (Owner decision).
 * @example const staff = useStaffAuthStore((state) => state.staff);
 */
import { createSessionStore } from "@/store/createSessionStore";
import * as adminAuthService from "@/services/adminAuth.service";
import { useAuthStore } from "@/store/authStore";
import { SESSION_HINT_COOKIES } from "@/utils/constants";

export const useStaffAuthStore = createSessionStore({
  scope: "staff",
  entityKey: "staff",
  hintCookie: SESSION_HINT_COOKIES.staff,
  refreshRequest: adminAuthService.refreshStaffSession,
  logoutRequest: adminAuthService.logoutStaff,
  extend: (set, get) => ({
    /**
     * Open the console with the app login (no second sign-in).
     * @returns {Promise<boolean>} false when not signed in to the app, or not staff
     */
    async enterWithAppLogin() {
      const auth = useAuthStore.getState();
      await auth.bootstrap();
      if (useAuthStore.getState().status !== "authenticated") return false;
      set({ status: "loading" });
      try {
        const { staff, accessToken } = await adminAuthService.openConsoleFromApp();
        get().setSession(staff, accessToken);
        return true;
      } catch {
        set({ status: "unauthenticated" });
        return false;
      }
    },

    /**
     * Tell the API the staff member is active (keeps the 30-minute idle timer
     * from ending the session while they are working). Never throws.
     * @returns {Promise<void>}
     */
    async heartbeat() {
      if (get().status !== "authenticated") return;
      try {
        const { staff } = await adminAuthService.getStaffMe();
        set({ staff });
      } catch {
        // A failed heartbeat that ends the session is handled by the API client
      }
    },
  }),
});
