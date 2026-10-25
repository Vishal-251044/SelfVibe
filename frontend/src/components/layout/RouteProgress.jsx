"use client";

/**
 * Thin neon progress bar at the top of the screen during page changes (Day 10
 * speed pass). It starts the moment an internal link is tapped, so every tap
 * gets instant feedback, and finishes when the new page's path is shown.
 * Only `transform` and `opacity` are animated (60fps on phones).
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

// Give up on a navigation that never finishes (cancelled, offline) after this long
const MAX_PENDING_MS = 12_000;

/**
 * The internal page a click is heading to, or null when it isn't a page change.
 * @param {MouseEvent} event
 * @returns {string|null} Path of the new page
 */
function targetPath(event) {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return null;
  return url.pathname === window.location.pathname ? null : url.pathname;
}

export default function RouteProgress() {
  const pathname = usePathname();
  // The path we were on when a navigation started; the bar shows while we're still there
  const [pendingFrom, setPendingFrom] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const onClick = (event) => {
      if (!targetPath(event)) return;
      setPendingFrom(window.location.pathname);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPendingFrom(null), MAX_PENDING_MS);
    };
    // Bubble phase: links that cancel navigation (preventDefault) are skipped
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      clearTimeout(timerRef.current);
    };
  }, []);

  const isActive = pendingFrom !== null && pendingFrom === pathname;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key={pendingFrom}
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5 origin-left bg-neon shadow-glow"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{
            scaleX: [0, 0.35, 0.7, 0.9],
            transition: { duration: 6, times: [0, 0.05, 0.3, 1], ease: "easeOut" },
          }}
          exit={{
            scaleX: 1,
            opacity: 0,
            transition: { scaleX: { duration: 0.15 }, opacity: { duration: 0.25, delay: 0.12 } },
          }}
        />
      )}
    </AnimatePresence>
  );
}
