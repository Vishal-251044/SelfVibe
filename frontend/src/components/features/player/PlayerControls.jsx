"use client";

/**
 * Transport controls (PRD PLY-1): shuffle, previous, play / pause, next,
 * repeat (off / all / one). Used by the desktop bar and Now Playing.
 */
import { motion } from "framer-motion";
import {
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { cn } from "@/utils/genericFunctions";
import { tapPress } from "@/utils/animations";

const REPEAT_LABELS = { off: "Repeat off", all: "Repeat all", one: "Repeat one" };

/**
 * Round icon button with an "active" state (shuffle / repeat).
 * @param {{ label: string, onClick: Function, active?: boolean, children: React.ReactNode, className?: string }} props
 */
function ControlButton({ label, onClick, active = false, children, className }) {
  return (
    <motion.button
      type="button"
      whileTap={tapPress}
      onClick={onClick}
      aria-label={label}
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
        active ? "text-neon" : "text-fg-muted hover:text-fg",
        className
      )}
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="absolute bottom-1 size-1 rounded-full bg-neon shadow-glow-sm"
        />
      )}
    </motion.button>
  );
}

/**
 * @param {Object} props
 * @param {"bar"|"large"} [props.size="bar"]
 * @param {string} [props.className]
 */
export default function PlayerControls({ size = "bar", className }) {
  const wantsToPlay = usePlayerStore((state) => state.wantsToPlay);
  const status = usePlayerStore((state) => state.status);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeat = usePlayerStore((state) => state.repeat);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const next = usePlayerStore((state) => state.next);
  const previous = usePlayerStore((state) => state.previous);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);

  const isLarge = size === "large";
  const iconSize = isLarge ? 26 : 20;
  const isLoading = wantsToPlay && status === "loading";
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        isLarge ? "gap-4 sm:gap-6" : "gap-2",
        className
      )}
    >
      <ControlButton
        label={shuffle ? "Shuffle on" : "Shuffle off"}
        active={shuffle}
        onClick={toggleShuffle}
      >
        <Shuffle size={isLarge ? 22 : 18} />
      </ControlButton>
      <ControlButton
        label="Previous"
        onClick={() => previous()}
        className={isLarge ? "size-14" : ""}
      >
        <SkipBack size={iconSize} fill="currentColor" />
      </ControlButton>
      <motion.button
        type="button"
        whileTap={tapPress}
        whileHover={{ scale: 1.05 }}
        onClick={togglePlay}
        aria-label={wantsToPlay ? "Pause" : "Play"}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-neon text-black shadow-glow transition-colors hover:bg-neon-hover",
          isLarge ? "size-18" : "size-12"
        )}
      >
        {isLoading ? (
          <Loader2 size={iconSize} className="animate-spin" aria-hidden />
        ) : wantsToPlay ? (
          <Pause size={iconSize} fill="currentColor" aria-hidden />
        ) : (
          <Play size={iconSize} fill="currentColor" className="translate-x-0.5" aria-hidden />
        )}
      </motion.button>
      <ControlButton label="Next" onClick={() => next()} className={isLarge ? "size-14" : ""}>
        <SkipForward size={iconSize} fill="currentColor" />
      </ControlButton>
      <ControlButton label={REPEAT_LABELS[repeat]} active={repeat !== "off"} onClick={cycleRepeat}>
        <RepeatIcon size={isLarge ? 22 : 18} />
      </ControlButton>
    </div>
  );
}
