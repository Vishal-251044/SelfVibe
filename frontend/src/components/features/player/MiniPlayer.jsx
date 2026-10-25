"use client";

/**
 * Phone mini player (PRD MOB-3/4), fixed above the bottom navigation:
 * cover, title, play / pause and next, with a thin progress line.
 * Tap opens the full-screen player; swipe left / right changes the song;
 * the mic takes voice commands (roadmap Day 7).
 */
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Loader2, Pause, Play, SkipForward } from "lucide-react";
import CoverArt from "@/components/features/music/CoverArt";
import MicButton from "@/components/features/voice/MicButton";
import { usePlayerStore } from "@/store/playerStore";
import { cn } from "@/utils/genericFunctions";
import { tapPress } from "@/utils/animations";

const SWIPE_DISTANCE = 72; // px
const SWIPE_VELOCITY = 500; // px/s

/**
 * @param {Object} props
 * @param {Object} props.track - Current queue item
 * @param {string} [props.className]
 */
export default function MiniPlayer({ track, className }) {
  const wantsToPlay = usePlayerStore((state) => state.wantsToPlay);
  const status = usePlayerStore((state) => state.status);
  const error = usePlayerStore((state) => state.error);
  const progress = usePlayerStore((state) =>
    state.duration > 0 ? Math.min(1, state.currentTime / state.duration) : 0
  );
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const next = usePlayerStore((state) => state.next);
  const previous = usePlayerStore((state) => state.previous);
  const setNowPlayingOpen = usePlayerStore((state) => state.setNowPlayingOpen);
  const isListener = usePlayerStore((state) => state.scope === "user");

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-140, 0, 140], [0.4, 1, 0.4]);

  const onDragEnd = (_, info) => {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) next();
    // A swipe always changes the song (never just restarts it)
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) previous(Infinity);
    animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
  };

  const isLoading = wantsToPlay && status === "loading";

  return (
    <div
      className={cn(
        "relative h-(--mini-player-height) overflow-hidden rounded-2xl border border-line-strong bg-surface-raised/95 shadow-panel backdrop-blur-xl",
        className
      )}
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        style={{ x, opacity }}
        onDragEnd={onDragEnd}
        className="flex h-full touch-pan-y items-center gap-3 pr-1 pl-2"
      >
        <button
          type="button"
          onClick={() => setNowPlayingOpen(true)}
          aria-label={`Open Now Playing: ${track.title}`}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
        >
          <CoverArt src={track.coverUrl} alt="" className="size-12 rounded-xl" sizes="48px" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-fg">{track.title}</span>
            <span className={cn("block truncate text-xs", error ? "text-danger" : "text-fg-muted")}>
              {error ?? track.artist?.stageName}
            </span>
          </span>
        </button>
        {isListener && <MicButton />}
        <motion.button
          type="button"
          whileTap={tapPress}
          onClick={togglePlay}
          aria-label={wantsToPlay ? "Pause" : "Play"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg"
        >
          {isLoading ? (
            <Loader2 size={22} className="animate-spin" aria-hidden />
          ) : wantsToPlay ? (
            <Pause size={22} fill="currentColor" aria-hidden />
          ) : (
            <Play size={22} fill="currentColor" aria-hidden />
          )}
        </motion.button>
        <motion.button
          type="button"
          whileTap={tapPress}
          onClick={() => next()}
          aria-label="Next"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted"
        >
          <SkipForward size={20} fill="currentColor" aria-hidden />
        </motion.button>
      </motion.div>
      {/* Progress line (transform only) */}
      <span
        aria-hidden
        className="absolute inset-x-3 bottom-0 h-0.5 overflow-hidden rounded-full bg-white/10"
      >
        <span
          className="block h-full w-full origin-left bg-neon transition-transform duration-200 ease-linear"
          style={{ transform: `scaleX(${progress})` }}
        />
      </span>
    </div>
  );
}
