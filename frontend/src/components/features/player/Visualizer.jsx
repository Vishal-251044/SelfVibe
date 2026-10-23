"use client";

/**
 * Audio visualiser for Now Playing (PRD PLY-8).
 * - Desktop: live frequency bars from a Web Audio analyser.
 * - Phones / iOS (no Web Audio, to keep background play safe): bars driven by
 *   the song's waveform peaks around the playhead, gently moving while playing.
 * Bars are updated straight on the DOM each animation frame (transform only),
 * so React doesn't re-render 60 times a second. Reduced motion → still bars.
 */
import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { getAnalyser } from "@/lib/player/audioEngine";
import { usePlayerStore } from "@/store/playerStore";
import { cn } from "@/utils/genericFunctions";

const BAR_COUNT = 40;
const MIN_SCALE = 0.06;

/**
 * Bar heights from waveform peaks near the playhead (fallback mode).
 * @param {number[]} peaks
 * @param {number} progress - 0–1
 * @param {number} time - Animation time in seconds
 * @param {boolean} isPlaying
 * @returns {number[]} 0–1 per bar
 */
function waveformBars(peaks, progress, time, isPlaying) {
  const center = Math.floor(progress * peaks.length);
  return Array.from({ length: BAR_COUNT }, (_, bar) => {
    const peak = peaks.length ? peaks[(center + bar) % peaks.length] : 0.4;
    // A mirrored arch so the middle bars are tallest, like a spectrum
    const arch = 0.55 + 0.45 * Math.sin((bar / (BAR_COUNT - 1)) * Math.PI);
    const wobble = isPlaying ? 0.7 + 0.3 * Math.sin(time * 6 + bar * 0.9) : 0.6;
    return peak * arch * wobble;
  });
}

/**
 * @param {Object} props
 * @param {boolean} props.isActive - Only animate while visible
 * @param {string} [props.className]
 */
export default function Visualizer({ isActive, className }) {
  const barsRef = useRef([]);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isActive) return undefined;
    let frame = 0;
    let analyser = null;
    let data = null;

    const draw = (now) => {
      const { status, currentTime, duration, queue, index } = usePlayerStore.getState();
      const isPlaying = status === "playing";
      if (isPlaying && !analyser) {
        analyser = getAnalyser();
        if (analyser) data = new Uint8Array(analyser.frequencyBinCount);
      }

      let heights;
      if (analyser && isPlaying && !prefersReducedMotion) {
        analyser.getByteFrequencyData(data);
        heights = Array.from({ length: BAR_COUNT }, (_, bar) => {
          // Logarithmic spacing (like a real spectrum analyser): music lives mostly in
          // the low and mid frequencies, so give them more bars
          const bin = Math.min(
            data.length - 1,
            Math.floor((data.length * 0.7) ** (bar / (BAR_COUNT - 1)))
          );
          return data[bin] / 255;
        });
      } else {
        const peaks = queue[index]?.waveform ?? [];
        const progress = duration > 0 ? currentTime / duration : 0;
        heights = waveformBars(peaks, progress, now / 1000, isPlaying && !prefersReducedMotion);
      }

      heights.forEach((height, bar) => {
        const element = barsRef.current[bar];
        if (element) element.style.transform = `scaleY(${Math.max(MIN_SCALE, height)})`;
      });
      if (!prefersReducedMotion) frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [isActive, prefersReducedMotion]);

  return (
    <div aria-hidden className={cn("flex h-24 items-end justify-center gap-[3px]", className)}>
      {Array.from({ length: BAR_COUNT }, (_, bar) => (
        <span
          key={bar}
          ref={(element) => {
            barsRef.current[bar] = element;
          }}
          className="h-full w-1 origin-bottom rounded-full bg-linear-to-t from-neon/40 to-neon shadow-glow-sm sm:w-1.5"
          style={{ transform: `scaleY(${MIN_SCALE})` }}
        />
      ))}
    </div>
  );
}
