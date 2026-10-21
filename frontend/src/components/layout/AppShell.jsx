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
import { pageTransition } from "@/utils/animations";

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function AppShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="relative isolate min-h-dvh">
      {/* Phone top bar */}
      <header className="pt-safe px-safe sticky top-0 z-40 border-b border-line bg-black/80 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center">
          <Logo href="/home" size="sm" />
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
        {children}
      </motion.main>

      <BottomNav />
    </div>
  );
}
