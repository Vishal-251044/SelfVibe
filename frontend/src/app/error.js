"use client";

/**
 * Global error boundary: shown when a page throws while rendering.
 */
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";

/**
 * @param {Object} props
 * @param {Error} props.error - The error that was thrown
 * @param {Function} props.reset - Re-render the segment to try again
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // TODO(Day 10): report to Sentry instead of the console
    console.error("[ErrorBoundary] page render failed:", error);
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
