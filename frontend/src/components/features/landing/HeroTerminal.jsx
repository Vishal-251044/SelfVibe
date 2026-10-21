"use client";

/**
 * Animated "now playing" terminal in the landing hero: a typed command,
 * track info, a live equalizer and a looping progress bar.
 */
import { motion } from "framer-motion";
import TerminalWindow from "@/components/ui/TerminalWindow";
import { formatDuration } from "@/utils/genericFunctions";

const COMMAND = "selfvibe play --vibe code";
const TRACK_LENGTH_SEC = 252;
// Fixed bar heights (0–1) so server and client render the same equalizer
const EQ_BARS = [0.45, 0.8, 0.6, 1, 0.7, 0.4, 0.85, 0.55, 0.95, 0.5, 0.75, 0.35, 0.9, 0.6];

export default function HeroTerminal() {
  return (
    <TerminalWindow className="mx-auto w-full max-w-3xl">
      {/* Typed command */}
      <p className="flex flex-wrap text-neon">
        <span className="mr-2">$</span>
        {COMMAND.split("").map((char, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + index * 0.035, duration: 0 }}
          >
            {char === " " ? " " : char}
          </motion.span>
        ))}
      </p>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 + COMMAND.length * 0.035 + 0.2, duration: 0.3 }}
        className="mt-3 space-y-1"
      >
        <p className="text-fg-muted">
          <span className="text-neon">{">>"}</span> Now playing:{" "}
          <span className="font-semibold text-fg">Midnight Algorithm</span>
        </p>
        <p className="text-fg-muted">
          <span className="text-neon">{">>"}</span> Artist:{" "}
          <span className="font-semibold text-fg">Vishal Chavan</span>
        </p>

        {/* Equalizer */}
        <div className="flex h-12 items-end gap-1 pt-4 sm:h-16" aria-hidden>
          {EQ_BARS.map((height, index) => (
            <motion.span
              key={index}
              className="h-full flex-1 origin-bottom rounded-sm bg-linear-to-t from-neon/40 to-neon-bright"
              initial={{ scaleY: 0.15 }}
              animate={{ scaleY: [0.15, height, 0.3, height * 0.7, 0.15] }}
              transition={{
                duration: 1.6 + (index % 4) * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.05,
              }}
            />
          ))}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 pt-3 text-xs text-fg-subtle sm:gap-4 sm:text-sm">
          <span className="tabular-nums">{formatDuration(84)}</span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="absolute inset-0 origin-left rounded-full bg-neon shadow-glow"
              initial={{ scaleX: 0.15 }}
              animate={{ scaleX: [0.15, 0.6] }}
              transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
            />
          </div>
          <span className="tabular-nums">{formatDuration(TRACK_LENGTH_SEC)}</span>
        </div>
      </motion.div>
    </TerminalWindow>
  );
}
