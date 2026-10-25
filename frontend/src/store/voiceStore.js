/**
 * Voice control state (PRD VOC-1..8, roadmap Day 7).
 * Saved in the browser: the recognition language and whether replies are
 * spoken. Not saved: whether the mic is listening, the live transcript, and
 * the "which one did you mean?" picker.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useVoiceStore = create(
  persist(
    (set) => ({
      /* ----- settings (saved) ----- */
      language: "en-IN",
      speakReplies: false,

      /* ----- session ----- */
      status: "idle", // idle | listening | thinking
      mode: "tap", // tap | hold — how the current session was started
      interim: "",
      picker: null, // { query, candidates, notFound, startedAt } — top-3 sheet (VOC-4/8)

      /** @param {"en-IN"|"hi-IN"} language */
      setLanguage: (language) => set({ language }),
      toggleSpeakReplies: () => set((state) => ({ speakReplies: !state.speakReplies })),
      /** @param {Partial<{ status: string, mode: string, interim: string }>} session */
      setSession: (session) => set(session),
      /** @param {Object|null} picker */
      setPicker: (picker) => set({ picker }),
    }),
    {
      name: "sv_voice",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ language: state.language, speakReplies: state.speakReplies }),
    }
  )
);
