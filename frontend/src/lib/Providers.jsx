"use client";

/**
 * Client-side providers mounted once in the root layout:
 * - React Query for server data
 * - Framer Motion config that respects the user's reduced-motion setting
 * - the music player engine (one shared <audio> for the whole app — PRD BGP-6)
 * - the service worker (installable app shell + offline screen — PRD PWA-3)
 * Zustand stores need no provider; they are imported where used.
 */
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { makeQueryClient } from "@/lib/queryClient";
import PlayerEngine from "@/components/features/player/PlayerEngine";
import ServiceWorkerRegister from "@/components/features/pwa/ServiceWorkerRegister";
import InstallListener from "@/components/features/pwa/InstallListener";
import RouteProgress from "@/components/layout/RouteProgress";

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function Providers({ children }) {
  // useState keeps one client for the whole session (not one per render)
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        {children}
        <PlayerEngine />
        <ServiceWorkerRegister />
        <InstallListener />
        <RouteProgress />
      </MotionConfig>
    </QueryClientProvider>
  );
}
