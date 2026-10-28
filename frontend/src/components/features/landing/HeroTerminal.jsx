"use client";

/**
 * Animated "now playing" card in the landing hero: artwork, song and artist,
 * a live equalizer, a looping progress bar and player buttons, so visitors
 * see what listening on SelfVibe feels like.
 */
import { motion } from "framer-motion";
import { Heart, Music2, Pause, SkipBack, SkipForward } from "lucide-react";
import EqualizerBars from "@/components/animations/EqualizerBars";
import { formatDuration } from "@/utils/genericFunctions";

const TRACK_LENGTH_SEC = 252;
// Fixed bar heights (0–1) so server and client render the same equalizer
const EQ_BARS = [0.45, 0.8, 0.6, 1, 0.7, 0.4, 0.85, 0.55, 0.95, 0.5, 0.75, 0.35, 0.9, 0.6];

export default function HeroTerminal() {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-surface/80 p-4 text-left shadow-panel backdrop-blur-xl sm:p-6">
      <div className="flex items-center gap-4 sm:gap-5">
        {/* Artwork */}
        <motion.div
          className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgb(34_197_94/0.65),transparent_60%),linear-gradient(140deg,#0b120d,#000)] shadow-glow sm:size-28"
          animate={{ rotate: [0, 1.5, 0, -1.5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <Music2 size={34} className="text-neon-bright" />
        </motion.div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-neon uppercase">
            Now playing · Code vibe
          </p>
          <p className="mt-1 truncate font-display text-xl font-bold tracking-tight sm:text-2xl">
            Midnight Algorithm
          </p>
          <p className="truncate text-sm text-fg-muted">Vishal Chavan</p>
        </div>
        <Heart
          size={22}
          className="hidden shrink-0 text-neon sm:block"
          fill="currentColor"
          aria-hidden
        />
      </div>

      {/* Equalizer */}
      <EqualizerBars bars={EQ_BARS} className="mt-5 h-12 sm:h-16" />

      {/* Progress */}
      <div className="mt-4 flex items-center gap-3 text-xs text-fg-subtle sm:gap-4 sm:text-sm">
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

      {/* Controls (illustration only) */}
      <div className="mt-4 flex items-center justify-center gap-6 text-fg-muted" aria-hidden>
        <SkipBack size={20} />
        <span className="flex size-12 items-center justify-center rounded-full bg-neon text-black shadow-glow">
          <Pause size={20} fill="currentColor" />
        </span>
        <SkipForward size={20} />
      </div>
    </div>
  );
}
