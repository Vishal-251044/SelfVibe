"use client";

/**
 * Phone bottom navigation (MOB-2): Home · Search · Library · Studio · Profile.
 * Fixed to the bottom with safe-area padding for the home indicator.
 * Hidden from md upwards, where AppTopNav is used instead.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { APP_NAV_ITEMS } from "@/utils/constants";
import { cn, isNavActive } from "@/utils/genericFunctions";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="App"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-black/85 backdrop-blur-xl md:hidden"
    >
      <ul className="grid h-(--bottom-nav-height) grid-cols-5">
        {APP_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium transition-colors",
                  isActive ? "text-neon" : "text-fg-subtle active:text-fg"
                )}
              >
                <span className="relative flex h-8 w-14 items-center justify-center">
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-indicator"
                      className="absolute inset-0 rounded-full bg-neon-dim"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <motion.span
                    className="relative"
                    animate={{ scale: isActive ? 1.08 : 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.4 : 1.9} aria-hidden />
                  </motion.span>
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
