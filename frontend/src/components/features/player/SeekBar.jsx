"use client";

/**
 * Seek bar with elapsed / total time (PRD PLY-1). A native range input, so it
 * works with touch, mouse and keyboard and is announced by screen readers.
 * While dragging, the thumb follows the finger and the seek happens on release.
 */
import { useState } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { cn, formatDuration } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {boolean} [props.showTimes=true]
 * @param {string} [props.className]
 */
export default function SeekBar({ showTimes = true, className }) {
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const seek = usePlayerStore((state) => state.seek);
  const [dragValue, setDragValue] = useState(null);

  const max = duration > 0 ? duration : 0;
  const value = dragValue ?? Math.min(currentTime, max);
  const percent = max ? (value / max) * 100 : 0;

  const commit = () => {
    if (dragValue !== null) seek(dragValue);
    setDragValue(null);
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showTimes && (
        <span className="w-10 shrink-0 text-right text-xs text-fg-subtle tabular-nums">
          {formatDuration(value)}
        </span>
      )}
      <input
        type="range"
        min={0}
        max={max || 1}
        step={0.1}
        value={value}
        disabled={!max}
        aria-label="Seek"
        aria-valuetext={`${formatDuration(value)} of ${formatDuration(max)}`}
        onChange={(event) => setDragValue(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        style={{ "--fill": `${percent}%` }}
        className="player-range h-11 min-w-0 flex-1 cursor-pointer disabled:cursor-default"
      />
      {showTimes && (
        <span className="w-10 shrink-0 text-xs text-fg-subtle tabular-nums">
          {formatDuration(max)}
        </span>
      )}
    </div>
  );
}
