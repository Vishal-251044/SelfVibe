"use client";

/**
 * One track in a list: number, cover with play button, title / artist,
 * optional status and duration, the queue menu (Play next / Add to queue)
 * and an optional actions slot. Highlights itself while it is the song
 * loaded in the player.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import CoverArt from "@/components/features/music/CoverArt";
import PlayButton from "@/components/features/music/PlayButton";
import Badge from "@/components/ui/Badge";
import { CATALOG_META } from "@/utils/musicConstants";
import TrackQueueMenu from "@/components/features/music/TrackQueueMenu";
import LikeButton from "@/components/features/music/LikeButton";
import { usePlayerStore } from "@/store/playerStore";
import { cn, formatDuration } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {Object} props.track - Public or managed track
 * @param {number} [props.index] - 1-based position, shown on wider screens
 * @param {Object[]} [props.tracks] - The whole list; playing a row queues the list from there
 * @param {boolean} [props.playable=false] - Show the play button (signed-in listener / staff)
 * @param {boolean} [props.canPlay=true] - false disables it (e.g. still processing)
 * @param {string} [props.source] - Listening-event source, e.g. "artist"
 * @param {"user"|"staff"} [props.scope="user"] - "staff" for Admin Console previews
 * @param {boolean} [props.showQueueMenu=false] - Heart + menu (Play next, Add to queue / playlist, Comments)
 * @param {string} [props.href] - Makes the title a link (e.g. admin detail page)
 * @param {boolean} [props.showArtist=true]
 * @param {boolean} [props.showCatalog=false] - Official / Community badge (PRD 10.14)
 * @param {React.ReactNode} [props.status] - e.g. <TrackStatusBadge />
 * @param {React.ReactNode} [props.actions]
 */
export default function TrackRow({
  track,
  index,
  tracks,
  playable = false,
  canPlay = true,
  source,
  scope = "user",
  showQueueMenu = false,
  href,
  showArtist = true,
  showCatalog = false,
  status,
  actions,
}) {
  const isCurrent = usePlayerStore((state) => state.queue[state.index]?.id === track.id);
  const title = href ? (
    <Link href={href} className="truncate font-medium text-fg hover:text-neon">
      {track.title}
    </Link>
  ) : (
    <span className={cn("truncate font-medium", isCurrent ? "text-neon" : "text-fg")}>
      {track.title}
    </span>
  );

  return (
    <motion.div
      whileHover={{ backgroundColor: "rgb(34 197 94 / 0.06)" }}
      className={cn(
        "group flex min-h-16 items-center gap-3 rounded-control px-2 py-2 sm:gap-4 sm:px-3",
        isCurrent && "bg-neon-dim"
      )}
    >
      {index !== undefined && (
        <span className="hidden w-6 shrink-0 text-right text-sm text-fg-subtle tabular-nums sm:block">
          {index}
        </span>
      )}

      <div className="relative">
        <CoverArt
          src={track.coverUrl}
          alt={`${track.title} cover`}
          className="size-12 rounded-lg"
          sizes="48px"
        />
        {playable && (
          <PlayButton
            track={track}
            tracks={tracks}
            index={index !== undefined ? index - 1 : undefined}
            source={source}
            scope={scope}
            size="sm"
            disabled={!canPlay}
            className="absolute inset-0 m-auto size-11 bg-black/55 text-white backdrop-blur-[2px] hover:bg-neon"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          {title}
          {track.explicit && (
            <span
              title="Explicit"
              aria-label="Explicit"
              className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-fg-muted text-[10px] font-bold text-black"
            >
              E
            </span>
          )}
          {showCatalog && CATALOG_META[track.catalog] && (
            <Badge
              tone={CATALOG_META[track.catalog].tone}
              className="hidden px-2 text-[10px] sm:inline-flex"
            >
              {CATALOG_META[track.catalog].label}
            </Badge>
          )}
        </div>
        {showArtist && track.artist && (
          <span className="flex min-w-0 items-center gap-1 text-sm text-fg-muted">
            <Link
              href={`/artist/${track.artist.slug ?? track.artist.id}`}
              className="truncate hover:text-neon"
            >
              {track.artist.stageName}
            </Link>
            {track.artist.verified && (
              <BadgeCheck size={14} className="shrink-0 text-neon" aria-label="Verified" />
            )}
          </span>
        )}
        {status && <div className="mt-1 sm:hidden">{status}</div>}
      </div>

      {status && <div className="hidden shrink-0 sm:block">{status}</div>}
      <span className="hidden w-12 shrink-0 text-right text-sm text-fg-subtle tabular-nums md:block">
        {track.durationSec ? formatDuration(track.durationSec) : "--:--"}
      </span>
      {(showQueueMenu || actions) && (
        <div className="flex shrink-0 items-center">
          {showQueueMenu && canPlay && <LikeButton track={track} />}
          {showQueueMenu && canPlay && <TrackQueueMenu track={track} showArtistLink={showArtist} />}
          {actions}
        </div>
      )}
    </motion.div>
  );
}
