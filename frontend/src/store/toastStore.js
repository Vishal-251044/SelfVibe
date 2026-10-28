/**
 * Toasts (roadmap Day 7 voice feedback, reusable app-wide): one short message,
 * an icon for the tone, and optionally what a voice command heard. Toasts
 * with the same `id` replace each other (e.g. "Looking for…" → "Playing").
 */
import { create } from "zustand";
import { createId } from "@/utils/genericFunctions";

const MAX_TOASTS = 3;
const timers = new Map();

export const useToastStore = create((set, get) => ({
  toasts: [], // { id, message, heard?, tone: "info"|"success"|"error"|"pending", action? }

  /**
   * Show (or replace) a toast.
   * @param {{ id?: string, heard?: string, message: string, tone?: string, action?: { label: string, onClick: () => void }, durationMs?: number }} toast
   * @returns {string} The toast id
   */
  show({ id = createId(), durationMs = 3500, ...toast }) {
    clearTimeout(timers.get(id));
    const next = { id, tone: "info", ...toast };
    set({ toasts: [...get().toasts.filter((item) => item.id !== id), next].slice(-MAX_TOASTS) });
    // Pending toasts stay until replaced
    if (next.tone !== "pending" && durationMs > 0) {
      timers.set(
        id,
        setTimeout(() => get().dismiss(id), durationMs)
      );
    }
    return id;
  },

  /** @param {string} id */
  dismiss(id) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    set({ toasts: get().toasts.filter((item) => item.id !== id) });
  },
}));

/**
 * Show a toast from anywhere (outside React too).
 * @param {Parameters<ReturnType<typeof useToastStore.getState>["show"]>[0]} toast
 * @returns {string}
 */
export function showToast(toast) {
  return useToastStore.getState().show(toast);
}
