"use client";

/**
 * Toasts (short confirmations, voice feedback), stacked above the mini player
 * and bottom nav on phones, bottom-right on desktop: an icon, one friendly
 * sentence, and for voice commands what was heard ("You said “agla gaana”").
 */
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, Loader2, X } from "lucide-react";
import { useToastStore } from "@/store/toastStore";
import { DURATION, EASE_OUT } from "@/utils/animations";
import { cn } from "@/utils/genericFunctions";

const TONE_ICON = { success: Check, error: AlertTriangle, info: Info, pending: Loader2 };
const TONE_BADGE = {
  success: "bg-neon/15 text-neon",
  error: "bg-danger/15 text-danger",
  info: "bg-white/10 text-fg-muted",
  pending: "bg-neon/15 text-neon",
};

export default function TerminalToaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--bottom-nav-height)+var(--player-height)+env(safe-area-inset-bottom)+0.75rem)] z-[70] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-[calc(var(--player-height)+1.5rem)] md:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone] ?? Info;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              role={toast.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-surface-raised/95 text-sm shadow-panel backdrop-blur-xl"
            >
              <div className="flex items-start gap-3 py-2.5 pr-1 pl-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    TONE_BADGE[toast.tone] ?? TONE_BADGE.info
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(toast.tone === "pending" && "animate-spin")}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 flex-1 py-1">
                  {toast.heard && (
                    <p className="truncate text-xs text-fg-subtle">You said “{toast.heard}”</p>
                  )}
                  <p className="break-words text-fg first-letter:uppercase">{toast.message}</p>
                  {toast.action && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.action.onClick();
                        dismiss(toast.id);
                      }}
                      className="mt-1 min-h-11 font-semibold text-neon underline-offset-4 hover:underline"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:text-fg"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
