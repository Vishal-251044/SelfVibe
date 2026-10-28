"use client";

/**
 * Full-screen Now Playing (PRD PLY-8, MOB-3/4): large artwork, a live
 * Playing / Paused status, the visualiser, seek bar and controls. Swipe down (or the close button / Escape) minimises it.
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { BadgeCheck, ChevronDown, ListMusic, ListPlus, MessageCircle } from "lucide-react";
import LikeButton from "@/components/features/music/LikeButton";
import ShareButton from "@/components/features/share/ShareButton";
import MicButton from "@/components/features/voice/MicButton";
import { useLibrarySheetsStore } from "@/store/librarySheetsStore";
import CoverArt from "@/components/features/music/CoverArt";
import PlayerControls from "@/components/features/player/PlayerControls";
import SeekBar from "@/components/features/player/SeekBar";
import VolumeControl from "@/components/features/player/VolumeControl";
import Visualizer from "@/components/features/player/Visualizer";
import SimilarTracks from "@/components/features/player/SimilarTracks";
import { usePlayerStore } from "@/store/playerStore";
import { formatDuration } from "@/utils/genericFunctions";
import { DURATION, EASE_OUT } from "@/utils/animations";

const CLOSE_DRAG_DISTANCE = 120; // px
const CLOSE_DRAG_VELOCITY = 600; // px/s

/** Live status of the song: Playing / Paused / Loading, and time played. */
function PlaybackStatus() {
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const status = usePlayerStore((state) => state.status);
  const label = status === "loading" ? "Loading" : status === "playing" ? "Playing" : "Paused";

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="inline-flex items-center gap-2 rounded-full bg-neon-dim px-3 py-1 font-medium text-neon">
        <span className="relative flex size-2">
          {status === "playing" && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon opacity-60" />
          )}
          <span className="relative inline-flex size-2 rounded-full bg-neon" />
        </span>
        {label}
      </span>
      <span className="text-fg-muted tabular-nums">
        {formatDuration(currentTime)}
        {duration > 0 && ` / ${formatDuration(duration)}`}
      </span>
    </div>
  );
}

export default function NowPlaying() {
  const isOpen = usePlayerStore((state) => state.isNowPlayingOpen);
  const track = usePlayerStore((state) => state.queue[state.index] ?? null);
  const error = usePlayerStore((state) => state.error);
  const isListener = usePlayerStore((state) => state.scope === "user");
  const openPlaylistPicker = useLibrarySheetsStore((state) => state.openPlaylistPicker);
  const openComments = useLibrarySheetsStore((state) => state.openComments);
  const upNext = usePlayerStore((state) => state.queue[state.index + 1] ?? null);
  const setNowPlayingOpen = usePlayerStore((state) => state.setNowPlayingOpen);
  const setQueueOpen = usePlayerStore((state) => state.setQueueOpen);
  const dragControls = useDragControls();
  const prefersReducedMotion = useReducedMotion();
  const close = () => setNowPlayingOpen(false);

  // Escape closes; lock page scroll behind the overlay
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      const player = usePlayerStore.getState();
      if (event.key === "Escape" && !player.isQueueOpen) player.setNowPlayingOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && track && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Now playing: ${track.title}`}
          initial={prefersReducedMotion ? { opacity: 0 } : { y: "100%" }}
          animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { y: "100%" }}
          transition={{ duration: DURATION.slow, ease: EASE_OUT }}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > CLOSE_DRAG_DISTANCE || info.velocity.y > CLOSE_DRAG_VELOCITY)
              close();
          }}
          className="pt-safe pb-safe px-safe fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ink"
        >
          {/* Blurred artwork glow behind everything */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-1/4 left-1/2 size-[140vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(34_197_94/0.18),transparent_60%)]" />
          </div>

          {/* Header — also the drag handle on phones */}
          <div
            onPointerDown={(event) => dragControls.start(event)}
            className="flex touch-none items-center justify-between gap-3 px-1 py-2 sm:px-6 sm:py-4"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Minimise player"
              className="flex size-11 items-center justify-center rounded-full text-fg-muted transition hover:bg-neon-dim hover:text-neon"
            >
              <ChevronDown size={26} />
            </button>
            <span
              className="mx-auto mt-1 h-1.5 w-12 rounded-full bg-line-strong sm:hidden"
              aria-hidden
            />
            <p className="hidden text-xs tracking-widest text-neon uppercase sm:block">
              Now playing
            </p>
            <button
              type="button"
              onClick={() => setQueueOpen(true)}
              aria-label="Open queue"
              className="flex size-11 items-center justify-center rounded-full text-fg-muted transition hover:bg-neon-dim hover:text-neon"
            >
              <ListMusic size={22} />
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-3 pb-6 sm:px-6 lg:flex-row lg:items-center lg:gap-12">
            {/* Artwork */}
            <motion.div
              key={track.qid}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: DURATION.slow, ease: EASE_OUT }}
              className="mx-auto w-full max-w-[min(22rem,70vw,42dvh)] shrink-0 lg:max-w-md"
            >
              <CoverArt
                src={track.coverUrl}
                alt={`${track.title} cover`}
                seed={track.id}
                className="aspect-square w-full rounded-card shadow-glow-lg"
                sizes="(min-width: 1024px) 28rem, 70vw"
                priority
              />
            </motion.div>

            {/* Status, visualiser + controls */}
            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <div className="min-w-0 text-center lg:text-left">
                <h2 className="truncate font-display text-[clamp(1.5rem,5vw,2.5rem)] leading-tight font-bold">
                  {track.title}
                </h2>
                {track.artist && (
                  <Link
                    href={`/artist/${track.artist.slug ?? track.artist.id}`}
                    onClick={close}
                    className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-fg-muted hover:text-neon"
                  >
                    {track.artist.stageName}
                    {track.artist.verified && (
                      <BadgeCheck size={16} className="text-neon" aria-label="Verified" />
                    )}
                  </Link>
                )}
                {error && (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                )}
              </div>

              <div className="hidden rounded-card border border-white/10 bg-surface/80 p-4 backdrop-blur sm:block">
                <PlaybackStatus />
                <Visualizer isActive={isOpen} className="mt-4 h-20" />
              </div>
              <Visualizer isActive={isOpen} className="h-16 sm:hidden" />

              {isListener && (
                <div className="flex items-center justify-center gap-2 lg:justify-start">
                  <LikeButton track={track} size={22} />
                  <button
                    type="button"
                    onClick={() => openPlaylistPicker(track)}
                    aria-label="Add to playlist"
                    className="flex size-11 items-center justify-center rounded-full text-fg-subtle transition hover:text-fg"
                  >
                    <ListPlus size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openComments(track)}
                    aria-label="Comments"
                    className="flex size-11 items-center justify-center rounded-full text-fg-subtle transition hover:text-fg"
                  >
                    <MessageCircle size={22} />
                  </button>
                  <ShareButton
                    type="track"
                    id={track.id}
                    title={track.title}
                    text={`${track.title} by ${track.artist?.stageName ?? "SelfVibe"}`}
                    size={22}
                  />
                  <MicButton size={22} />
                </div>
              )}
              <SeekBar />
              <PlayerControls size="large" />
              <div className="hidden items-center justify-between gap-4 md:flex">
                <VolumeControl />
                {upNext && (
                  <p className="min-w-0 truncate text-sm text-fg-subtle">
                    Up next: <span className="text-fg-muted">{upNext.title}</span>
                  </p>
                )}
              </div>
              {isListener && <SimilarTracks track={track} />}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
