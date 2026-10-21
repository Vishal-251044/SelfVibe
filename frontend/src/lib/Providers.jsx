"use client";

/**
 * Client-side providers mounted once in the root layout:
 * - React Query for server data
 * - Framer Motion config that respects the user's reduced-motion setting
 * Zustand stores need no provider; they are imported where used.
 */
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { makeQueryClient } from "@/lib/queryClient";

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function Providers({ children }) {
  // useState keeps one client for the whole session (not one per render)
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  );
}
