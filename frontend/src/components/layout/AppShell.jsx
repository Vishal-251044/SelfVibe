"use client";

/**
 * Mobile-first shell for every signed-in app screen.
 * - Phones: compact top bar with the logo + fixed bottom navigation
 * - md and up: full top navbar, no bottom bar
 * Content gets bottom padding so it never hides behind the bottom bar
 * plus the player dock's height while a song is loaded (--player-height).
 */
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import AppTopNav from "@/components/layout/AppTopNav";
import BottomNav from "@/components/layout/BottomNav";
import PlayerDock from "@/components/features/player/PlayerDock";
import LibrarySheets from "@/components/features/library/LibrarySheets";
import VoiceLayer from "@/components/features/voice/VoiceLayer";
import Logo from "@/components/ui/Logo";
import AuthGuard from "@/components/features/auth/AuthGuard";
import UserMenu from "@/components/features/auth/UserMenu";
import { pageTransition } from "@/utils/animations";
import { PUBLIC_APP_PATHS } from "@/utils/constants";
import { isNavActive } from "@/utils/genericFunctions";
import MaintenanceGate from "@/components/layout/MaintenanceGate";
import InstallPrompt from "@/components/features/pwa/InstallPrompt";

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function AppShell({ children }) {
  const pathname = usePathname();
  // Public pages (shared artist links) render for guests too
  const isPublicPage = PUBLIC_APP_PATHS.some((path) => isNavActive(pathname, path));

  return (
    <div className="relative isolate min-h-dvh">
      {/* Phone top bar */}
      <header className="pt-safe px-safe sticky top-0 z-40 border-b border-line bg-black/80 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-between">
          <Logo href="/home" size="sm" />
          <UserMenu />
        </div>
      </header>

      <AppTopNav />

      <motion.main
        id="main"
        tabIndex={-1}
        key={pathname}
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        className="px-safe mx-auto w-full max-w-7xl pt-4 pb-[calc(var(--bottom-nav-height)+var(--player-height)+env(safe-area-inset-bottom)+2rem)] outline-none md:px-6 md:pt-8 md:pb-[calc(var(--player-height)+4rem)]"
      >
        <MaintenanceGate>
          <AuthGuard optional={isPublicPage}>{children}</AuthGuard>
        </MaintenanceGate>
      </motion.main>

      <PlayerDock variant="app" />
      <LibrarySheets />
      <VoiceLayer />
      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
