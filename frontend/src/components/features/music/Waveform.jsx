"use client";

/**
 * Static waveform from the peaks the API computes during processing (0–1).
 * While its song is loaded in the player, the played part lights up and a
 * tap / click seeks to that point. Bars use scaleY transforms (cheap on phones).
 */
import { usePlayerStore } from "@/store/playerStore";
import { cn } from "@/utils/genericFunctions";

/**
 * Reduce peaks to `count` bars (max of each bucket) for narrow screens.
 * @param {number[]} peaks
 * @param {number} count
 * @returns {number[]}
 */
function downsample(peaks, count) {
  if (peaks.length <= count) return peaks;
  const bucket = peaks.length / count;
  return Array.from({ length: count }, (_, index) =>
    Math.max(...peaks.slice(Math.floor(index * bucket), Math.floor((index + 1) * bucket)))
  );
}

/**
 * @param {Object} props
 * @param {string} props.trackId
 * @param {number[]} props.peaks
 * @param {number} [props.bars=80]
 * @param {string} [props.className] - Height, e.g. "h-16"
 */
export default function Waveform({ trackId, peaks, bars = 80, className }) {
  const isCurrent = usePlayerStore((state) => state.queue[state.index]?.id === trackId);
  const progress = usePlayerStore((state) =>
    state.queue[state.index]?.id === trackId && state.duration > 0
      ? state.currentTime / state.duration
      : 0
  );
  const duration = usePlayerStore((state) => state.duration);
  const seek = usePlayerStore((state) => state.seek);

  if (!peaks?.length) return null;
  const values = downsample(peaks, bars);

  /** Seek to the clicked position (only for the song that is loaded). */
  const handleClick = (event) => {
    if (!isCurrent || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    seek(((event.clientX - rect.left) / rect.width) * duration);
  };

  return (
    <div
      aria-hidden
      onClick={handleClick}
      className={cn(
        "flex h-16 w-full items-center gap-[2px]",
        isCurrent && "cursor-pointer",
        className
      )}
    >
      {values.map((peak, index) => {
        const isPlayed = isCurrent && index / values.length <= progress;
        return (
          <span
            key={index}
            className={cn(
              "h-full flex-1 origin-center rounded-full transition-colors duration-150",
              isPlayed ? "bg-neon shadow-glow-sm" : "bg-line-strong"
            )}
            style={{ transform: `scaleY(${Math.max(0.06, peak)})` }}
          />
        );
      })}
    </div>
  );
}
