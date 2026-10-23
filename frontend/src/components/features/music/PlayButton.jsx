"use client";

/**
 * Round play / pause button for a track, wired to the global player.
 * Pressing it on a new song plays the surrounding list as the queue (e.g. an
 * artist's songs, starting from this one); on the current song it toggles play.
 */
import { motion } from "framer-motion";
import { Loader2, Pause, Play } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { cn } from "@/utils/genericFunctions";
import { tapPress } from "@/utils/animations";

const SIZES = {
  sm: { button: "size-11", icon: 16 },
  md: { button: "size-12", icon: 20 },
  lg: { button: "size-14", icon: 24 },
};

/**
 * @param {Object} props
 * @param {Object} props.track
 * @param {Object[]} [props.tracks] - The list this track belongs to (becomes the queue)
 * @param {number} [props.index] - Position of the track in `tracks`
 * @param {string} [props.source] - Where playback starts, for listening events ("artist", …)
 * @param {"user"|"staff"} [props.scope="user"] - "staff" for Admin Console previews
 * @param {"sm"|"md"|"lg"} [props.size="md"]
 * @param {boolean} [props.disabled=false] - e.g. still processing
 * @param {string} [props.className]
 */
export default function PlayButton({
  track,
  tracks,
  index,
  source,
  scope = "user",
  size = "md",
  disabled = false,
  className,
}) {
  const isCurrent = usePlayerStore((state) => state.queue[state.index]?.id === track.id);
  const wantsToPlay = usePlayerStore((state) => state.wantsToPlay);
  const status = usePlayerStore((state) => state.status);
  const playQueue = usePlayerStore((state) => state.playQueue);
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  const isPlaying = isCurrent && wantsToPlay;
  const isLoading = isPlaying && status === "loading";
  const { button, icon } = SIZES[size];

  const handleClick = (event) => {
    event.stopPropagation();
    if (isCurrent) {
      togglePlay();
      return;
    }
    const list = tracks?.length ? tracks : [track];
    const start = tracks?.length ? (index ?? list.findIndex((item) => item.id === track.id)) : 0;
    playQueue(list, Math.max(0, start), { source, scope });
  };

  return (
    <motion.button
      type="button"
      whileTap={tapPress}
      whileHover={disabled ? undefined : { scale: 1.06 }}
      disabled={disabled}
      onClick={handleClick}
      aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      aria-pressed={isPlaying}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        isCurrent
          ? "bg-neon text-black shadow-glow"
          : "bg-neon-dim text-neon hover:bg-neon hover:text-black hover:shadow-glow-sm",
        button,
        className
      )}
    >
      {isLoading ? (
        <Loader2 size={icon} className="animate-spin" aria-hidden />
      ) : isPlaying ? (
        <Pause size={icon} fill="currentColor" aria-hidden />
      ) : (
        <Play size={icon} fill="currentColor" className="translate-x-px" aria-hidden />
      )}
    </motion.button>
  );
}
