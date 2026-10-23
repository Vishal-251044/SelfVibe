"use client";

/**
 * Where the player lives on screen (PRD PLY-2, MOB-3): the mini player above
 * the bottom navigation on phones, the full player bar on larger screens,
 * plus the Now Playing overlay and the queue. Shows up once a song is loaded,
 * and tells the page to leave room for it (html[data-player]).
 */
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MiniPlayer from "@/components/features/player/MiniPlayer";
import PlayerBar from "@/components/features/player/PlayerBar";
import NowPlaying from "@/components/features/player/NowPlaying";
import QueuePanel from "@/components/features/player/QueuePanel";
import { usePlayerStore } from "@/store/playerStore";
import { cn } from "@/utils/genericFunctions";
import { DURATION, EASE_OUT } from "@/utils/animations";

const dockMotion = {
  initial: { y: "120%", opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: DURATION.slow, ease: EASE_OUT } },
  exit: { y: "120%", opacity: 0, transition: { duration: DURATION.base } },
};

/**
 * @param {Object} props
 * @param {"app"|"console"} props.variant - app = above the phone bottom nav; console = Admin Console layout
 */
export default function PlayerDock({ variant }) {
  const track = usePlayerStore((state) => state.queue[state.index] ?? null);
  const hasTrack = Boolean(track);

  // Reserve space for the dock under the page content
  useEffect(() => {
    document.documentElement.dataset.player = hasTrack ? "on" : "off";
    return () => {
      document.documentElement.dataset.player = "off";
    };
  }, [hasTrack]);

  return (
    <>
      <AnimatePresence>
        {track && (
          <motion.div
            key="mini"
            {...dockMotion}
            className={cn(
              "fixed inset-x-2 z-40 md:hidden",
              variant === "app"
                ? "bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.5rem)]"
                : "bottom-[calc(env(safe-area-inset-bottom)+0.5rem)]"
            )}
          >
            <MiniPlayer track={track} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {track && (
          <motion.div
            key="bar"
            {...dockMotion}
            className={cn(
              "pb-safe fixed inset-x-0 bottom-0 z-40 hidden border-t border-line bg-black/90 backdrop-blur-xl md:block",
              variant === "console" && "lg:left-64"
            )}
          >
            <PlayerBar track={track} />
          </motion.div>
        )}
      </AnimatePresence>
      <NowPlaying />
      <QueuePanel />
    </>
  );
}
