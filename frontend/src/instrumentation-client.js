/**
 * Runs in the browser before the app starts (Next.js instrumentation-client).
 * Starts error tracking after the page has loaded, when a Sentry DSN is set.
 */
import { loadSentry } from "@/lib/errorTracking";

if (process.env.NEXT_PUBLIC_SENTRY_DSN && typeof window !== "undefined") {
  const start = () => loadSentry().catch(() => {});
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
