"use client";

/**
 * Mute button + volume slider (PRD PLY-1). Desktop only — phones use their
 * hardware volume buttons.
 */
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string} [props.className]
 */
export default function VolumeControl({ className }) {
  const volume = usePlayerStore((state) => state.volume);
  const muted = usePlayerStore((state) => state.muted);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleMute = usePlayerStore((state) => state.toggleMute);

  const level = muted ? 0 : volume;
  const Icon = level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition hover:text-neon"
      >
        <Icon size={20} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={level}
        aria-label="Volume"
        aria-valuetext={`${Math.round(level * 100)}%`}
        onChange={(event) => setVolume(Number(event.target.value))}
        style={{ "--fill": `${level * 100}%` }}
        className="player-range h-11 w-24 cursor-pointer"
      />
    </div>
  );
}
