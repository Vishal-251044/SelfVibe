"use client";

/**
 * "More like this" in Now Playing (PRD 10.4.2 v2, roadmap Day 9 Similar
 * tracks): songs other fans of this song also love, then songs with the same
 * genre / vibe. Tap one to play it (the list continues as the queue), or
 * start a radio from the current song.
 */
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import CoverArt from "@/components/features/music/CoverArt";
import Skeleton from "@/components/ui/Skeleton";
import { getSimilarTracks } from "@/services/feed.service";
import { usePlayerStore } from "@/store/playerStore";
import { useCatalogFilter } from "@/hooks/useCatalogFilter";
import { QUERY_KEYS } from "@/utils/constants";
import { tapPress } from "@/utils/animations";

const SHOWN = 6;

/**
 * @param {Object} props
 * @param {{ id: string, title: string }} props.track - The song playing now
 */
export default function SimilarTracks({ track }) {
  const trackId = track?.id ?? null;
  const { catalog } = useCatalogFilter();
  const playQueue = usePlayerStore((state) => state.playQueue);
  const query = useQuery({
    queryKey: [...QUERY_KEYS.similar(trackId), catalog],
    queryFn: ({ signal }) => getSimilarTracks(trackId, { catalog, limit: 20 }, { signal }),
    enabled: Boolean(trackId),
    staleTime: 10 * 60 * 1000,
  });
  const items = query.data?.items ?? [];
  if (!trackId || query.isError || (!query.isPending && items.length === 0)) return null;

  return (
    <section aria-label="More like this" className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neon-soft">More like this</h3>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => playQueue([track, ...items], 0, { source: "feed" })}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs text-fg-muted transition hover:bg-neon-dim hover:text-neon"
          >
            <Radio size={14} aria-hidden /> Start radio
          </button>
        )}
      </div>
      {query.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, SHOWN).map((item, index) => (
            <li key={item.id}>
              <motion.button
                type="button"
                whileTap={tapPress}
                onClick={() => playQueue(items, index, { source: "feed" })}
                aria-label={`Play ${item.title} by ${item.artist?.stageName ?? "unknown artist"}`}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition hover:bg-surface-raised"
              >
                <CoverArt
                  src={item.coverUrl}
                  alt=""
                  seed={item.id}
                  className="size-10 rounded-md"
                  sizes="40px"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{item.title}</span>
                  <span className="block truncate text-xs text-fg-subtle">{item.reason}</span>
                </span>
              </motion.button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
