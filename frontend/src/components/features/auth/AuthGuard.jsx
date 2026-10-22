"use client";

/**
 * Client-side protected-route guard for the listener app.
 * - Restores the session on load; sends signed-out visitors to /login?next=…
 *   (src/proxy.js already redirects most of them before the page renders).
 * - Sends signed-in users who have not done the taste quiz to /onboarding
 *   first (PRD ONB-1), unless the page itself is the quiz.
 */
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import ScreenLoader from "@/components/ui/ScreenLoader";
import SessionErrorState from "@/components/features/auth/SessionErrorState";
import { getPostAuthRedirect } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.allowIncompleteOnboarding=false] - true for the quiz page itself
 */
export default function AuthGuard({ children, allowIncompleteOnboarding = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const retryBootstrap = useAuthStore((state) => state.retryBootstrap);

  const needsOnboarding =
    status === "authenticated" && !allowIncompleteOnboarding && !user?.onboardingDone;

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (needsOnboarding) {
      router.replace(getPostAuthRedirect(user, pathname));
    }
  }, [status, needsOnboarding, user, pathname, router]);

  if (status === "error") return <SessionErrorState onRetry={retryBootstrap} />;
  if (status !== "authenticated" || needsOnboarding) {
    return <ScreenLoader label="restoring your session" />;
  }
  return children;
}
