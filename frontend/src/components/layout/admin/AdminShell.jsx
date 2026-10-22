"use client";

/**
 * Owner / Admin Console shell: guards the console, then lays out a fixed
 * sidebar (desktop) or slide-in drawer (phones / tablets), the top bar and
 * the page. Signs the staff member out after 30 minutes of inactivity.
 */
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import AdminSidebar from "@/components/layout/admin/AdminSidebar";
import AdminTopbar from "@/components/layout/admin/AdminTopbar";
import ScreenLoader from "@/components/ui/ScreenLoader";
import SessionErrorState from "@/components/features/auth/SessionErrorState";
import { useStaffAuthStore } from "@/store/staffAuthStore";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { STAFF_HEARTBEAT_INTERVAL_MS, STAFF_IDLE_TIMEOUT_MS } from "@/utils/adminConstants";
import { DURATION, EASE_OUT, pageTransition } from "@/utils/animations";

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useStaffAuthStore((state) => state.status);
  const staff = useStaffAuthStore((state) => state.staff);
  const bootstrap = useStaffAuthStore((state) => state.bootstrap);
  const logout = useStaffAuthStore((state) => state.logout);
  const heartbeat = useStaffAuthStore((state) => state.heartbeat);
  const retryBootstrap = useStaffAuthStore((state) => state.retryBootstrap);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Session ended (expired, idle on the server, revoked): back to sign-in
  useEffect(() => {
    if (status === "unauthenticated" && !isSigningOut)
      router.replace("/admin/login?reason=expired");
  }, [status, isSigningOut, router]);

  const signOut = useCallback(
    async (reason) => {
      setIsSigningOut(true);
      await logout();
      router.replace(`/admin/login?reason=${reason}`);
    },
    [logout, router]
  );

  useIdleTimeout({
    enabled: status === "authenticated",
    timeoutMs: STAFF_IDLE_TIMEOUT_MS,
    onIdle: () => signOut("idle"),
    heartbeatMs: STAFF_HEARTBEAT_INTERVAL_MS,
    onActiveHeartbeat: heartbeat,
  });

  if (status === "error") {
    return (
      <div className="px-safe flex min-h-dvh items-center justify-center">
        <SessionErrorState onRetry={retryBootstrap} className="w-full max-w-lg" />
      </div>
    );
  }
  if (status !== "authenticated" || !staff) {
    return <ScreenLoader label="verifying console access" className="min-h-dvh" />;
  }

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-surface lg:block">
        <AdminSidebar permissions={staff.permissions} />
      </aside>

      {/* Phone / tablet drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              aria-hidden
            />
            <motion.aside
              className="pt-safe pb-safe fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] border-r border-line-strong bg-surface shadow-panel lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              aria-label="Console menu"
            >
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close console menu"
                className="absolute top-3 right-3 z-10 flex size-11 items-center justify-center rounded-xl text-fg-muted hover:text-neon"
              >
                <X size={20} />
              </button>
              <AdminSidebar
                permissions={staff.permissions}
                onNavigate={() => setIsDrawerOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AdminTopbar
        staff={staff}
        onOpenMenu={() => setIsDrawerOpen(true)}
        onSignOut={() => signOut("signedout")}
        isSigningOut={isSigningOut}
      />

      <motion.main
        key={pathname}
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        className="pb-safe mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10"
      >
        {children}
      </motion.main>
    </div>
  );
}
