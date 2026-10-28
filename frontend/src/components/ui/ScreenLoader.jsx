"use client";

/**
 * Full-area loading state (e.g. while a session is restored or a page opens):
 * the SelfVibe mic in a spinning neon ring, a small equalizer and a friendly
 * line of text. Only transform / opacity animate (smooth on phones), and
 * Framer's MotionConfig (reducedMotion="user") calms it for people who ask.
 */
import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import EqualizerBars from "@/components/animations/EqualizerBars";
import { cn } from "@/utils/genericFunctions";

const LOADER_BARS = [0.5, 0.9, 0.65, 1, 0.75];

/**
 * @param {Object} props
 * @param {string} [props.label="Loading"] - e.g. "Getting your music ready"
 * @param {string} [props.className]
 */
export default function ScreenLoader({ label = "Loading", className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex min-h-[50dvh] flex-col items-center justify-center gap-6", className)}
    >
      <div className="relative flex size-20 items-center justify-center" aria-hidden>
        {/* Spinning gradient ring */}
        <motion.span
          className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,var(--color-neon)_120deg,transparent_240deg)] opacity-80"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
        <span className="absolute inset-[3px] rounded-full bg-ink" />
        {/* Breathing glow behind the mic */}
        <motion.span
          className="absolute inset-3 rounded-full bg-neon/15 blur-md"
          animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="relative flex size-12 items-center justify-center rounded-full border border-neon/50 bg-surface text-neon shadow-glow-sm"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Mic size={22} strokeWidth={2.25} />
        </motion.span>
      </div>
      <EqualizerBars bars={LOADER_BARS} className="h-5 w-12" />
      <p className="text-sm font-medium text-fg-muted">
        {label}
        <motion.span
          aria-hidden
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          …
        </motion.span>
      </p>
    </div>
  );
}
