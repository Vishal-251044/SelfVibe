"use client";

/**
 * Registers the service worker (public/sw.js) in production builds only —
 * in development it would cache files that change on every save.
 */
import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () =>
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // The app works the same without it; it just won't open offline
      });
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
