"use client";

/**
 * Static waveform from the peaks the API computes during processing (0–1).
 * The played part is highlighted when this track is playing in the preview player.
 * Bars use scaleY transforms, so drawing stays cheap on phones.
 */
import { usePreviewPlayerStore } from "@/store/previewPlayerStore";
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
  const isCurrent = usePreviewPlayerStore((state) => state.trackId === trackId);
  const progress = usePreviewPlayerStore((state) =>
    state.trackId === trackId && state.duration > 0 ? state.currentTime / state.duration : 0
  );

  if (!peaks?.length) return null;
  const values = downsample(peaks, bars);

  return (
    <div aria-hidden className={cn("flex h-16 w-full items-center gap-[2px]", className)}>
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
