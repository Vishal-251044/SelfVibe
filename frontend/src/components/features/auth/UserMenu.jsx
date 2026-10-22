"use client";

/**
 * Avatar button with a dropdown: who is signed in, Profile, Log out.
 * Closes on outside click, Escape and navigation.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, UserRound } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/authStore";
import { slideDown } from "@/utils/animations";

export default function UserMenu() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace("/login");
  };

  if (!user) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex size-11 items-center justify-center rounded-full transition hover:shadow-glow-sm"
      >
        <Avatar name={user.name} src={user.avatar} size="sm" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            variants={slideDown}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-card border border-line-strong bg-black/95 shadow-panel backdrop-blur-xl"
          >
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
              <p className="truncate text-xs text-fg-muted">{user.email}</p>
            </div>
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center gap-3 px-4 text-sm text-fg-muted transition hover:bg-neon-dim hover:text-neon"
            >
              <UserRound size={18} aria-hidden />
              Profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex min-h-11 w-full items-center gap-3 px-4 text-sm text-fg-muted transition hover:bg-neon-dim hover:text-neon disabled:opacity-50"
            >
              <LogOut size={18} aria-hidden />
              {isLoggingOut ? "Logging out…" : "Log out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
