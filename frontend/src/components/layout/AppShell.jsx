"use client";

/**
 * Mobile-first shell for every signed-in app screen.
 * - Phones: compact top bar with the logo + fixed bottom navigation
 * - md and up: full top navbar, no bottom bar
 * Content gets bottom padding so it never hides behind the bottom bar
 * (the mini player on Day 5 will add its own height on top of this).
 */
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import AppTopNav from "@/components/layout/AppTopNav";
import BottomNav from "@/components/layout/BottomNav";
import Logo from "@/components/ui/Logo";
import AuthGuard from "@/components/features/auth/AuthGuard";
import UserMenu from "@/components/features/auth/UserMenu";
import { pageTransition } from "@/utils/animations";
import { PUBLIC_APP_PATHS } from "@/utils/constants";
import { isNavActive } from "@/utils/genericFunctions";

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
        key={pathname}
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        className="px-safe mx-auto w-full max-w-7xl pt-6 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+2rem)] md:px-6 md:pt-10 md:pb-16"
      >
        <AuthGuard optional={isPublicPage}>{children}</AuthGuard>
      </motion.main>

      <BottomNav />
    </div>
  );
}
