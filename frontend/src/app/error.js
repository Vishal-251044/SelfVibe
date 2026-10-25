"use client";

/**
 * Global error boundary: shown when a page throws while rendering.
 */
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { reportError } from "@/lib/errorTracking";

/**
 * @param {Object} props
 * @param {Error} props.error - The error that was thrown
 * @param {Function} props.reset - Re-render the segment to try again
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Sent to Sentry when it is set up (Day 10); the digest links it to the server log
    reportError(error, { digest: error?.digest, boundary: "page" });
  }, [error]);

  return (
    <div className="px-safe flex min-h-dvh items-center justify-center py-12">
      <EmptyState
        icon={TriangleAlert}
        command="selfvibe render"
        title="something went wrong"
        description="We hit an unexpected error while loading this page."
        action={<Button onClick={reset}>Try again</Button>}
        className="w-full max-w-lg"
      />
    </div>
  );
}
