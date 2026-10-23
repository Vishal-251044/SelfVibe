"use client";

/**
 * Modal panel: a bottom sheet on phones and a centred dialog from `sm` up
 * (CLAUDE.md: bottom sheets instead of large modals on mobile).
 * Closes on Escape and backdrop tap, locks page scroll, moves focus inside,
 * and returns focus to the trigger when it closes.
 */
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { dialogPop, overlayFade, sheetUp } from "@/utils/animations";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer] - Action buttons, pinned under the content
 * @param {string} [props.className] - Extra classes for the panel (e.g. a wider max-width)
 * @param {boolean} [props.dismissible=true] - false while something is saving
 */
export default function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  dismissible = true,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const prefersReducedMotion = useReducedMotion();

  // Escape to close, lock body scroll, focus management
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && dismissible) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    // Focus the first field / button inside, else the panel itself
    const focusTimer = setTimeout(() => {
      const target = panelRef.current?.querySelector(
        "input, select, textarea, button:not([data-sheet-close])"
      );
      (target ?? panelRef.current)?.focus();
    }, 50);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, dismissible]);

  if (typeof document === "undefined") return null;
  const panelVariants = prefersReducedMotion ? overlayFade : isDesktop ? dialogPop : sheetUp;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            aria-hidden
            variants={overlayFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={dismissible ? onClose : undefined}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "relative flex max-h-[90dvh] w-full flex-col overflow-hidden border border-line-strong bg-surface shadow-panel outline-none",
              "rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:max-w-lg sm:rounded-card sm:pb-0",
              className
            )}
          >
            {/* Drag handle look on phones */}
            <div
              className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-line-strong sm:hidden"
              aria-hidden
            />
            <div className="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-6">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-lg font-bold text-fg">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
              </div>
              {dismissible && (
                <button
                  type="button"
                  data-sheet-close
                  onClick={onClose}
                  aria-label="Close"
                  className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-fg-subtle transition hover:bg-neon-dim hover:text-neon"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
            {footer && (
              <div className="border-t border-line bg-black/40 px-5 py-4 sm:px-6">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
