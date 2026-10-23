"use client";

/**
 * Round play / pause button wired to the shared preview player.
 * Shows a spinner while the stream URL loads and an equalizer pulse while playing.
 */
import { motion } from "framer-motion";
import { Loader2, Pause, Play } from "lucide-react";
import { usePreviewPlayerStore } from "@/store/previewPlayerStore";
import { cn } from "@/utils/genericFunctions";
import { tapPress } from "@/utils/animations";

const SIZES = {
  sm: { button: "size-11", icon: 16 },
  md: { button: "size-12", icon: 20 },
  lg: { button: "size-14", icon: 24 },
};

/**
 * @param {Object} props
 * @param {string} props.trackId
 * @param {string} props.title - For the accessible label
 * @param {() => Promise<{ url: string, durationSec?: number }>} props.loadUrl
 * @param {"sm"|"md"|"lg"} [props.size="md"]
 * @param {boolean} [props.disabled=false] - e.g. still processing
 * @param {string} [props.className]
 */
export default function PlayButton({
  trackId,
  title,
  loadUrl,
  size = "md",
  disabled = false,
  className,
}) {
  const isCurrent = usePreviewPlayerStore((state) => state.trackId === trackId);
  const status = usePreviewPlayerStore((state) => state.status);
  const toggle = usePreviewPlayerStore((state) => state.toggle);

  const isPlaying = isCurrent && status === "playing";
  const isLoading = isCurrent && status === "loading";
  const { button, icon } = SIZES[size];

  return (
    <motion.button
      type="button"
      whileTap={tapPress}
      whileHover={disabled ? undefined : { scale: 1.06 }}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        toggle(trackId, loadUrl);
      }}
      aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
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
