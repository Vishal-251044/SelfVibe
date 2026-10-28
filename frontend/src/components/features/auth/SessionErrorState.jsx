"use client";

/**
 * Shown when the session could not be checked because the API was unreachable
 * (offline, server restarting). Offers a retry instead of logging the user out.
 */
import { useState } from "react";
import { WifiOff } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";

/**
 * @param {Object} props
 * @param {() => Promise<void>} props.onRetry
 * @param {string} [props.className]
 */
export default function SessionErrorState({ onRetry, className }) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    await onRetry();
    setIsRetrying(false);
  };

  return (
    <EmptyState
      icon={WifiOff}
      title="can't reach SelfVibe"
      description="Check your internet connection. You are still signed in — try again in a moment."
      action={
        <Button onClick={handleRetry} loading={isRetrying}>
          Try again
        </Button>
      }
      className={className}
    />
  );
}
