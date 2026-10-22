"use client";

/**
 * Client-side protected-route guard for the listener app.
 * Restores the session on load; sends signed-out visitors to /login?next=…
 * (src/proxy.js already redirects most of them before the page renders).
 */
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import ScreenLoader from "@/components/ui/ScreenLoader";
import SessionErrorState from "@/components/features/auth/SessionErrorState";

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const retryBootstrap = useAuthStore((state) => state.retryBootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  if (status === "error") return <SessionErrorState onRetry={retryBootstrap} />;
  if (status !== "authenticated") return <ScreenLoader label="restoring your session" />;
  return children;
}
