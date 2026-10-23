"use client";

/**
 * Client-side protected-route guard for the listener app.
 * - Restores the session on load; sends signed-out visitors to /login?next=…
 *   (src/proxy.js already redirects most of them before the page renders).
 * - Sends signed-in users who have not done the taste quiz to /onboarding
 *   first (PRD ONB-1), unless the page itself is the quiz.
 * - `optional` pages (e.g. public artist pages) render for everyone: the
 *   session is restored when there is one, but nobody is redirected.
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
 * @param {boolean} [props.optional=false] - Public page: never redirect or block
 */
export default function AuthGuard({
  children,
  allowIncompleteOnboarding = false,
  optional = false,
}) {
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
    if (optional) return;
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (needsOnboarding) {
      router.replace(getPostAuthRedirect(user, pathname));
    }
  }, [optional, status, needsOnboarding, user, pathname, router]);

  if (optional) return children;

  if (status === "error") return <SessionErrorState onRetry={retryBootstrap} />;
  if (status !== "authenticated" || needsOnboarding) {
    return <ScreenLoader label="restoring your session" />;
  }
  return children;
}
