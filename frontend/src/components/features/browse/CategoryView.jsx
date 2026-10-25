"use client";

/**
 * A genre or vibe page (/browse/genre/:slug, /browse/vibe/:slug — PRD BRW-1/2):
 * coloured header, Play / Shuffle, the catalog switch, Popular / New sort,
 * and the songs with "Load more".
 */
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, Compass, Play, Shuffle } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import TaxonomyIcon from "@/components/ui/TaxonomyIcon";
import FadeIn from "@/components/animations/FadeIn";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackRow from "@/components/features/music/TrackRow";
import CatalogSwitch from "@/components/features/browse/CatalogSwitch";
import { getCategory } from "@/services/browse.service";
import { useCatalogFilter } from "@/hooks/useCatalogFilter";
import { usePlayerStore } from "@/store/playerStore";
import { QUERY_KEYS } from "@/utils/constants";
import { BROWSE_PAGE_SIZE } from "@/utils/musicConstants";
import { cn, pluralize } from "@/utils/genericFunctions";

const SORTS = [
  { value: "popular", label: "Popular" },
  { value: "new", label: "New" },
];

/**
 * @param {Object} props
 * @param {"genre"|"vibe"} props.kind
 * @param {string} props.slug
 */
export default function CategoryView({ kind, slug }) {
  const { catalog } = useCatalogFilter();
  const [sort, setSort] = useState("popular");
  const playQueue = usePlayerStore((state) => state.playQueue);
  const setShuffle = usePlayerStore((state) => state.setShuffle);

  const query = useInfiniteQuery({
    queryKey: QUERY_KEYS.category(kind, slug, catalog, sort),
    queryFn: ({ pageParam, signal }) =>
      getCategory(
        kind,
        slug,
        { catalog, sort, page: pageParam, limit: BROWSE_PAGE_SIZE },
        { signal }
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
  });
  const firstPage = query.data?.pages[0];
  const category = firstPage?.category;
  const tracks = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = firstPage?.meta.total ?? 0;
  const colour = category?.colour ?? "#22C55E";

  /** Play the loaded songs, optionally shuffled. */
  const play = (shuffled) => {
    setShuffle(shuffled);
    playQueue(tracks, 0, { source: "browse" });
  };

  if (query.isError && !firstPage) {
    const isMissing = query.error?.status === 404;
    return (
      <EmptyState
        icon={Compass}
        command={`selfvibe browse --${kind} ${slug}`}
        title={isMissing ? `no ${kind} called "${slug}"` : `couldn't load this ${kind}`}
        description={isMissing ? "It may have been renamed or hidden." : query.error?.message}
        action={
          isMissing ? (
            <Button href="/search">Browse all</Button>
          ) : (
            <Button onClick={() => query.refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  return (
    <>
      <Button href="/search" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Browse
      </Button>

      <FadeIn className="relative mb-8 overflow-hidden rounded-card border border-line p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(circle at 15% 0%, ${colour}55, transparent 60%), linear-gradient(160deg, ${colour}22, #000 75%)`,
          }}
        />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <span
            className="flex size-24 shrink-0 items-center justify-center rounded-card bg-black/50 shadow-panel backdrop-blur sm:size-32"
            style={{ color: colour, boxShadow: `0 0 50px ${colour}40` }}
          >
            {category ? (
              <TaxonomyIcon name={category.icon} size={48} aria-hidden />
            ) : (
              <Skeleton className="size-12" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs tracking-widest uppercase" style={{ color: colour }}>
              {kind}
            </p>
            {category ? (
              <h1 className="mt-1 truncate font-display text-[clamp(2rem,6vw,3.5rem)] leading-none font-bold">
                {category.name}
              </h1>
            ) : (
              <Skeleton className="mt-2 h-10 w-48" />
            )}
            {category?.description && (
              <p className="mt-2 text-sm text-fg-muted">{category.description}</p>
            )}
            <p className="mt-1 text-xs text-fg-subtle">
              {query.isPending ? "…" : pluralize(total, "song")}
            </p>
          </div>
        </div>
        {tracks.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => play(false)}>
              <Play size={18} fill="currentColor" aria-hidden /> Play
            </Button>
            <Button size="lg" variant="outline" onClick={() => play(true)}>
              <Shuffle size={18} aria-hidden /> Shuffle
            </Button>
          </div>
        )}
      </FadeIn>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CatalogSwitch />
        <div role="tablist" aria-label="Sort songs" className="flex gap-1">
          {SORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={sort === option.value}
              onClick={() => setSort(option.value)}
              className={cn(
                "min-h-11 rounded-full px-4 text-sm transition",
                sort === option.value ? "bg-neon-dim text-neon" : "text-fg-muted hover:text-fg"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {query.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-control" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <EmptyState
          icon={Compass}
          command={`selfvibe browse --${kind} ${slug} --catalog ${catalog}`}
          title={`no ${catalog === "all" ? "" : `${catalog} `}songs here yet`}
          description={catalog === "all" ? "Check back soon." : "Try switching to All."}
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
                  showCatalog
                  source="browse"
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
