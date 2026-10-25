"use client";

/**
 * Terminal-style toasts (roadmap Day 7 voice feedback), stacked above the
 * mini player and bottom nav on phones, bottom-right on desktop:
 *   $ selfvibe voice "agla gaana"
 *   >> skipping to next track  (check icon)
 */
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, Loader2, X } from "lucide-react";
import { useToastStore } from "@/store/toastStore";
import { DURATION, EASE_OUT } from "@/utils/animations";
import { cn } from "@/utils/genericFunctions";

const TONE_ICON = { success: Check, error: AlertTriangle, info: Info, pending: Loader2 };
const TONE_CLASS = {
  success: "text-neon",
  error: "text-danger",
  info: "text-fg-muted",
  pending: "text-neon",
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
              className="pointer-events-auto w-full max-w-md overflow-hidden rounded-xl border border-line-strong bg-black/90 font-mono text-xs shadow-panel backdrop-blur-xl sm:text-sm"
            >
              <div className="flex items-start gap-2 py-2 pr-1 pl-4">
                <div className="min-w-0 flex-1 space-y-1 py-1">
                  {toast.command && <p className="truncate text-fg-muted">$ {toast.command}</p>}
                  <p className={cn("flex items-center gap-2", TONE_CLASS[toast.tone])}>
                    <span aria-hidden>{">>"}</span>
                    <span className="min-w-0 flex-1 break-words text-fg">{toast.message}</span>
                    <Icon
                      size={16}
                      className={cn("shrink-0", toast.tone === "pending" && "animate-spin")}
                      aria-hidden
                    />
                  </p>
                  {toast.action && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.action.onClick();
                        dismiss(toast.id);
                      }}
                      className="min-h-11 text-neon underline-offset-4 hover:underline"
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
