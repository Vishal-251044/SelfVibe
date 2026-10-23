"use client";

/**
 * Upload / processing progress bar. Animates `scaleX` (not width) so it stays
 * smooth on phones.
 */
import { motion } from "framer-motion";
import { cn } from "@/utils/genericFunctions";
import { DURATION, EASE_OUT } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {number} props.value - 0–100
 * @param {string} props.label - Accessible name, e.g. "Uploading song.mp3"
 * @param {"neon"|"danger"} [props.tone="neon"]
 * @param {string} [props.className]
 */
export default function ProgressBar({ value, label, tone = "neon", className }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-raised", className)}
    >
      <motion.div
        className={cn(
          "h-full w-full origin-left rounded-full",
          tone === "danger" ? "bg-danger" : "bg-neon shadow-glow-sm"
        )}
        initial={false}
        animate={{ scaleX: clamped / 100 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
      />
    </div>
  );
}
