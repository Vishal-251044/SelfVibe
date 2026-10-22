"use client";

/**
 * Inline message box for forms (errors from the API, info, success).
 * Animates in and out; announced to screen readers.
 */
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/utils/genericFunctions";
import { slideDown } from "@/utils/animations";

const TONES = {
  error: { icon: CircleAlert, classes: "border-danger/40 bg-danger/10 text-danger" },
  success: { icon: CircleCheck, classes: "border-line-strong bg-neon-dim text-neon-soft" },
  info: { icon: Info, classes: "border-line bg-surface text-fg-muted" },
};

/**
 * @param {Object} props
 * @param {string|null} props.message - Nothing renders when empty
 * @param {"error"|"success"|"info"} [props.tone="error"]
 * @param {string} [props.className]
 */
export default function FormAlert({ message, tone = "error", className }) {
  const { icon: Icon, classes } = TONES[tone];

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key={message}
          role={tone === "error" ? "alert" : "status"}
          variants={slideDown}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "flex items-start gap-3 rounded-control border px-4 py-3 text-sm",
            classes,
            className
          )}
        >
          <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
