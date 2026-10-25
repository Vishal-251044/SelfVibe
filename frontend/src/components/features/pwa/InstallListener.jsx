"use client";

/**
 * Catches the browser's install offer as early as possible (it can fire on
 * any page, before the app shell mounts) and notices when SelfVibe runs as an
 * installed app. Renders nothing.
 */
import { useEffect } from "react";
import { useInstallStore } from "@/store/installStore";
import { isStandaloneApp } from "@/utils/pwa";

export default function InstallListener() {
  useEffect(() => {
    const { setDeferredPrompt, markInstalled } = useInstallStore.getState();
    if (isStandaloneApp()) markInstalled();

    const onBeforeInstall = (event) => {
      event.preventDefault(); // we show our own prompt at a better moment
      setDeferredPrompt(event);
    };
    const onInstalled = () => markInstalled();
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
