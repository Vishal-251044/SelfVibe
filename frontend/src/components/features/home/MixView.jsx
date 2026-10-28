"use client";

/**
 * One Daily Mix (/mix/[index], roadmap Day 9): cover mosaic, Play / Shuffle
 * and the 30 songs. The mix stays the same all day and refreshes tomorrow.
 */
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Disc3, Play, Shuffle } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import FadeIn from "@/components/animations/FadeIn";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackRow from "@/components/features/music/TrackRow";
import MixCover from "@/components/features/home/MixCover";
import { getDailyMixes } from "@/services/feed.service";
import { usePlayerStore } from "@/store/playerStore";
import { useCatalogFilter } from "@/hooks/useCatalogFilter";
import { QUERY_KEYS } from "@/utils/constants";
import { formatDuration, pluralize } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {number} props.index - 1, 2 or 3
 */
export default function MixView({ index }) {
  const { catalog } = useCatalogFilter();
  const playQueue = usePlayerStore((state) => state.playQueue);
  const setShuffle = usePlayerStore((state) => state.setShuffle);
  const query = useQuery({
    queryKey: QUERY_KEYS.dailyMixes(catalog),
    queryFn: ({ signal }) => getDailyMixes({ catalog }, { signal }),
    staleTime: 30 * 60 * 1000,
  });
  const mix = query.data?.mixes.find((item) => item.index === index);

  if (query.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-56 rounded-card" />
        {Array.from({ length: 6 }, (_, row) => (
          <Skeleton key={row} className="h-16 rounded-control" />
        ))}
      </div>
    );
  }
  if (query.isError || !mix) {
    return (
      <EmptyState
        icon={Disc3}
        title={query.isError ? "couldn't load your mix" : "this mix isn't ready yet"}
        description={
          query.isError
            ? query.error?.message
            : "Like and play a few more songs — your Daily Mixes build from your taste."
        }
        action={
          query.isError ? (
            <Button onClick={() => query.refetch()}>Try again</Button>
          ) : (
            <Button href="/home">Back to Home</Button>
          )
        }
      />
    );
  }

  const totalSeconds = mix.tracks.reduce((sum, track) => sum + (track.durationSec ?? 0), 0);
  const play = (shuffled) => {
    setShuffle(shuffled);
    playQueue(mix.tracks, 0, { source: "feed" });
  };

  return (
    <>
      <Button href="/home" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Home
      </Button>
      <FadeIn className="mb-8 flex flex-col items-center gap-6 rounded-card border border-line bg-surface p-6 text-center sm:flex-row sm:items-end sm:p-8 sm:text-left">
        <MixCover mix={mix} className="w-44 shrink-0 shadow-glow-lg sm:w-52" />
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-widest text-neon uppercase">Made for you · today</p>
          <h1 className="mt-1 font-display text-[clamp(2rem,6vw,3.5rem)] leading-none font-bold">
            {mix.title}
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            {mix.tag.name} · {mix.subtitle}
          </p>
          <p className="mt-1 text-xs text-fg-subtle">
            {pluralize(mix.tracks.length, "song")} · {formatDuration(totalSeconds)}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
            <Button size="lg" onClick={() => play(false)}>
              <Play size={18} fill="currentColor" aria-hidden /> Play
            </Button>
            <Button size="lg" variant="outline" onClick={() => play(true)}>
              <Shuffle size={18} aria-hidden /> Shuffle
            </Button>
          </div>
        </div>
      </FadeIn>
      <Stagger className="space-y-1" stagger={0.02} inView={false}>
        {mix.tracks.map((track, position) => (
          <StaggerItem key={track.id}>
            <TrackRow
              track={track}
              index={position + 1}
              tracks={mix.tracks}
              playable
              showQueueMenu
              showCatalog
              source="feed"
            />
          </StaggerItem>
        ))}
      </Stagger>
    </>
  );
}
