"use client";

/**
 * Desktop / tablet player bar (md and up), fixed to the bottom of the page
 * (PRD PLY-2): current song, transport controls with the seek bar, volume,
 * queue and the full-screen Now Playing button.
 */
import Link from "next/link";
import { ListMusic, Maximize2 } from "lucide-react";
import CoverArt from "@/components/features/music/CoverArt";
import PlayerControls from "@/components/features/player/PlayerControls";
import SeekBar from "@/components/features/player/SeekBar";
import VolumeControl from "@/components/features/player/VolumeControl";
import MicButton from "@/components/features/voice/MicButton";
import LikeButton from "@/components/features/music/LikeButton";
import { usePlayerStore } from "@/store/playerStore";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {Object} props.track - Current queue item
 * @param {string} [props.className]
 */
export default function PlayerBar({ track, className }) {
  const error = usePlayerStore((state) => state.error);
  const isListener = usePlayerStore((state) => state.scope === "user");
  const isQueueOpen = usePlayerStore((state) => state.isQueueOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const setNowPlayingOpen = usePlayerStore((state) => state.setNowPlayingOpen);

  return (
    <div
      className={cn(
        "grid h-(--player-bar-height) grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-4 px-4 lg:px-6",
        className
      )}
    >
      {/* Song */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setNowPlayingOpen(true)}
          aria-label="Open Now Playing"
          className="shrink-0 rounded-lg transition hover:shadow-glow-sm"
        >
          <CoverArt
            src={track.coverUrl}
            alt={`${track.title} cover`}
            className="size-14 rounded-lg"
            sizes="56px"
          />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{track.title}</p>
          {error ? (
            <p role="alert" className="truncate text-xs text-danger">
              {error}
            </p>
          ) : (
            track.artist && (
              <Link
                href={`/artist/${track.artist.slug ?? track.artist.id}`}
                className="block truncate text-xs text-fg-muted hover:text-neon"
              >
                {track.artist.stageName}
              </Link>
            )
          )}
        </div>
        {isListener && <LikeButton track={track} />}
      </div>

      {/* Transport */}
      <div className="flex min-w-0 flex-col items-center">
        <PlayerControls />
        <SeekBar className="-mt-1 w-full max-w-xl" />
      </div>

      {/* Extras */}
      <div className="flex items-center justify-end gap-1">
        {isListener && <MicButton />}
        <button
          type="button"
          onClick={() => setQueueOpen(!isQueueOpen)}
          aria-label="Queue"
          aria-pressed={isQueueOpen}
          className={cn(
            "flex size-11 items-center justify-center rounded-full transition",
            isQueueOpen ? "text-neon" : "text-fg-muted hover:text-fg"
          )}
        >
          <ListMusic size={20} />
        </button>
        <VolumeControl className="hidden lg:flex" />
        <button
          type="button"
          onClick={() => setNowPlayingOpen(true)}
          aria-label="Open Now Playing"
          className="flex size-11 items-center justify-center rounded-full text-fg-muted transition hover:text-fg"
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
}
