"use client";

/**
 * Liked Songs (/library/liked, PRD LIB-1): every song you liked, newest
 * first, with Play / Shuffle and "Load more".
 */
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Play, Shuffle } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import FadeIn from "@/components/animations/FadeIn";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackRow from "@/components/features/music/TrackRow";
import { getLikedTracks } from "@/services/library.service";
import { usePlayerStore } from "@/store/playerStore";
import { QUERY_KEYS } from "@/utils/constants";
import { pluralize } from "@/utils/genericFunctions";

const PAGE_SIZE = 50;

export default function LikedSongsView() {
  const playQueue = usePlayerStore((state) => state.playQueue);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);

  const query = useInfiniteQuery({
    queryKey: QUERY_KEYS.likedTracks,
    queryFn: ({ pageParam, signal }) =>
      getLikedTracks({ page: pageParam, limit: PAGE_SIZE }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
  });
  const tracks = query.data?.pages.flatMap((page) => page.items.map((item) => item.track)) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  /** Play everything, optionally shuffled. */
  const play = (shuffled) => {
    if (shuffled !== shuffle) toggleShuffle();
    playQueue(tracks, 0, { source: "playlist" });
  };

  return (
    <>
      <Button href="/library" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Library
      </Button>
      <FadeIn className="mb-8 flex flex-col items-center gap-6 rounded-card border border-line bg-surface p-6 text-center sm:flex-row sm:items-end sm:p-8 sm:text-left">
        <div className="flex size-36 shrink-0 items-center justify-center rounded-card bg-[radial-gradient(circle_at_30%_20%,rgb(34_197_94/0.5),transparent_60%),linear-gradient(160deg,#0b120d,#000)] shadow-glow-lg sm:size-44">
          <Heart size={56} className="text-neon" fill="currentColor" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-widest text-neon uppercase">Playlist</p>
          <h1 className="mt-1 font-display text-[clamp(2rem,6vw,3.5rem)] leading-none font-bold">
            Liked Songs
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            {query.isPending ? "…" : pluralize(total, "song")}
          </p>
          {tracks.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
              <Button size="lg" onClick={() => play(false)}>
                <Play size={18} fill="currentColor" aria-hidden /> Play
              </Button>
              <Button size="lg" variant="outline" onClick={() => play(true)}>
                <Shuffle size={18} aria-hidden /> Shuffle
              </Button>
            </div>
          )}
        </div>
      </FadeIn>

      {query.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-control" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={Heart}
          command="selfvibe likes --list"
          title="couldn't load your liked songs"
          description={query.error?.message}
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
        />
      ) : tracks.length === 0 ? (
        <EmptyState
          icon={Heart}
          command="selfvibe likes --list"
          title="no liked songs yet"
          description="Tap the heart on any song to save it here."
          action={<Button href="/search">Find music</Button>}
        />
      ) : (
        <>
          <Stagger className="space-y-1" stagger={0.02} inView={false}>
            {tracks.map((track, index) => (
              <StaggerItem key={track.id}>
                <TrackRow
                  track={track}
                  index={index + 1}
                  tracks={tracks}
                  playable
                  showQueueMenu
                  source="playlist"
                />
              </StaggerItem>
            ))}
          </Stagger>
          {query.hasNextPage && (
            <Button
              variant="outline"
              fullWidth
              className="mt-4"
              onClick={() => query.fetchNextPage()}
              loading={query.isFetchingNextPage}
            >
              Load more
            </Button>
          )}
        </>
      )}
    </>
  );
}
