/**
 * Install-app state (PRD PWA-2, roadmap Day 10): the browser's saved
 * "beforeinstallprompt" event (Android Chrome / Edge / desktop Chrome), and
 * whether SelfVibe already runs as an installed app. Filled by
 * InstallListener (mounted once in Providers), read by the install prompt and
 * the profile page's "Install app" button.
 */
import { create } from "zustand";

export const useInstallStore = create((set, get) => ({
  deferredPrompt: null, // BeforeInstallPromptEvent, when the browser offers installation
  isInstalled: false,

  /** @param {Event|null} event */
  setDeferredPrompt(event) {
    set({ deferredPrompt: event });
  },
  markInstalled() {
    set({ isInstalled: true, deferredPrompt: null });
  },

  /**
   * Show the browser's install dialog.
   * @returns {Promise<"accepted"|"dismissed"|"unavailable">}
   */
  async promptInstall() {
    const event = get().deferredPrompt;
    if (!event) return "unavailable";
    set({ deferredPrompt: null }); // the event can only be used once
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") set({ isInstalled: true });
    return outcome;
  },
}));
