"use client";

/**
 * Desktop/tablet top navbar for the signed-in app (hidden on phones, where
 * BottomNav takes over). The active link gets an animated neon underline.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import UserMenu from "@/components/features/auth/UserMenu";
import { APP_NAV_ITEMS } from "@/utils/constants";
import { cn, isNavActive } from "@/utils/genericFunctions";

// Profile lives in the avatar menu on the right, not in the link row
const LINK_ITEMS = APP_NAV_ITEMS.filter((item) => item.href !== "/profile");

export default function AppTopNav() {
  const pathname = usePathname();

  return (
    <header className="pt-safe sticky top-0 z-40 hidden border-b border-line bg-black/80 backdrop-blur-xl md:block">
      <nav
        aria-label="App"
        className="mx-auto flex h-(--top-nav-height) max-w-7xl items-center justify-between px-6"
      >
        <Logo href="/home" />

        <ul className="flex items-center gap-1">
          {LINK_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = isNavActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm transition-colors",
                    isActive ? "text-neon" : "text-fg-muted hover:text-fg"
                  )}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                  {isActive && (
                    <motion.span
                      layoutId="top-nav-indicator"
                      className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-neon shadow-glow"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <UserMenu />
      </nav>
    </header>
  );
}
