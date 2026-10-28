"use client";

/**
 * Jump back in (PRD 10.4.3): the last songs you played as compact tiles —
 * 2 columns on phones, 3 on desktop. Tapping a tile plays from there.
 */
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import CoverArt from "@/components/features/music/CoverArt";
import FadeIn from "@/components/animations/FadeIn";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { usePlayerStore } from "@/store/playerStore";
import { tapPress } from "@/utils/animations";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {{ title: string, subtitle?: string, items: Object[] }} props.section
 */
export default function JumpBackIn({ section }) {
  const currentId = usePlayerStore((state) => state.queue[state.index]?.id ?? null);
  const wantsToPlay = usePlayerStore((state) => state.wantsToPlay);
  const playQueue = usePlayerStore((state) => state.playQueue);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const tracks = section.items;

  return (
    <FadeIn className="mb-7 sm:mb-10">
      <section aria-label={section.title}>
        <h2 className="mb-4 font-display text-lg font-bold tracking-tight sm:text-xl">
          {section.title}
        </h2>
        <Stagger
          className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3"
          stagger={0.04}
          inView={false}
        >
          {tracks.map((track, index) => {
            const isCurrent = currentId === track.id;
            const isPlaying = isCurrent && wantsToPlay;
            return (
              <StaggerItem key={track.id}>
                <motion.button
                  type="button"
                  whileTap={tapPress}
                  onClick={() =>
                    isCurrent ? togglePlay() : playQueue(tracks, index, { source: "history" })
                  }
                  aria-label={`${isPlaying ? "Pause" : "Play"} ${track.title}`}
                  className={cn(
                    "group flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-control border bg-surface pr-2 text-left transition hover:bg-surface-raised",
                    isCurrent
                      ? "border-neon shadow-glow-sm"
                      : "border-line hover:border-line-strong"
                  )}
                >
                  <CoverArt
                    src={track.coverUrl}
                    alt=""
                    seed={track.id}
                    className="size-14 shrink-0 sm:size-16"
                    sizes="64px"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-semibold",
                        isCurrent ? "text-neon" : "text-fg"
                      )}
                    >
                      {track.title}
                    </span>
                    <span className="block truncate text-xs text-fg-muted">
                      {track.artist?.stageName}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "hidden size-9 shrink-0 items-center justify-center rounded-full bg-neon text-black shadow-glow-sm transition sm:flex",
                      isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {isPlaying ? (
                      <Pause size={16} fill="currentColor" />
                    ) : (
                      <Play size={16} fill="currentColor" />
                    )}
                  </span>
                </motion.button>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>
    </FadeIn>
  );
}
