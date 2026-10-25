"use client";

/**
 * Song card for horizontal Home rows (Trending, New Releases…): large
 * artwork with a play button that appears on hover (always visible on touch),
 * title, artist and the Official / Community badge.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import CoverArt from "@/components/features/music/CoverArt";
import PlayButton from "@/components/features/music/PlayButton";
import Badge from "@/components/ui/Badge";
import { usePlayerStore } from "@/store/playerStore";
import { CATALOG_META } from "@/utils/musicConstants";
import { hoverLift } from "@/utils/animations";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {Object} props.track
 * @param {Object[]} props.tracks - The whole row (becomes the queue)
 * @param {number} props.index
 * @param {string} [props.source="browse"]
 * @param {number} [props.rank] - Show a chart number (Trending)
 */
export default function TrackCard({ track, tracks, index, source = "browse", rank }) {
  const isCurrent = usePlayerStore((state) => state.queue[state.index]?.id === track.id);
  const catalog = CATALOG_META[track.catalog];

  return (
    <motion.div whileHover={hoverLift} className="group h-full">
      <div className="relative">
        <CoverArt
          src={track.coverUrl}
          alt={`${track.title} cover`}
          seed={track.id}
          className={cn(
            "aspect-square w-full rounded-card transition",
            isCurrent ? "shadow-glow ring-2 ring-neon" : "group-hover:shadow-glow-sm"
          )}
          sizes="(min-width: 1280px) 12rem, (min-width: 768px) 10rem, 40vw"
        />
        {rank && (
          <span className="absolute top-2 left-2 rounded-md bg-black/75 px-2 py-0.5 font-mono text-xs font-bold text-neon backdrop-blur">
            #{rank}
          </span>
        )}
        <PlayButton
          track={track}
          tracks={tracks}
          index={index}
          source={source}
          className="absolute right-2 bottom-2 shadow-panel transition [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100"
        />
      </div>
      <p className={cn("mt-3 truncate text-sm font-semibold", isCurrent ? "text-neon" : "text-fg")}>
        {track.title}
      </p>
      <div className="mt-0.5 flex min-w-0 items-center gap-2">
        {track.artist ? (
          <Link
            href={`/artist/${track.artist.slug ?? track.artist.id}`}
            className="min-w-0 truncate text-xs text-fg-muted hover:text-neon"
          >
            {track.artist.stageName}
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {catalog && (
          <Badge tone={catalog.tone} className="ml-auto shrink-0 px-1.5 py-0 text-[0.625rem]">
            {catalog.label}
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
