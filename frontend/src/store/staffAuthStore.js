/**
 * Staff console session store. Separate from the listener session: signing in
 * to the console never signs anyone in to the app, and vice versa (PRD ADL-4).
 * @example const staff = useStaffAuthStore((state) => state.staff);
 */
import { createSessionStore } from "@/store/createSessionStore";
import * as adminAuthService from "@/services/adminAuth.service";
import { SESSION_HINT_COOKIES } from "@/utils/constants";

export const useStaffAuthStore = createSessionStore({
  scope: "staff",
  entityKey: "staff",
  hintCookie: SESSION_HINT_COOKIES.staff,
  refreshRequest: adminAuthService.refreshStaffSession,
  logoutRequest: adminAuthService.logoutStaff,
  extend: (set, get) => ({
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
