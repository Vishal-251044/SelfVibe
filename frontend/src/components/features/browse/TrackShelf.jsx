"use client";

/**
 * A titled horizontal row of song cards (Home: Trending, New Releases,
 * SelfVibe Official, From the Community, and the For You sections). Swipe on
 * phones (snap scrolling),
 * arrow buttons on desktop. Handles loading (skeleton cards), error and empty.
 */
import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import FadeIn from "@/components/animations/FadeIn";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackCard from "@/components/features/browse/TrackCard";
import { usePlayerStore } from "@/store/playerStore";

const SKELETON_CARDS = 6;
const CARD_CLASS = "w-[42vw] max-w-48 shrink-0 snap-start sm:w-40 xl:w-48";

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {Object} props.query - React Query result (loading / error); its data.items are the songs…
 * @param {Object[]} [props.items] - …unless the songs are given here (a feed section)
 * @param {string} [props.source="browse"] - Listening-event source
 * @param {boolean} [props.showReason=false] - "Why this?" label on cards
 * @param {(track: Object) => void} [props.onNotInterested] - Adds "Not interested" to cards
 * @param {string} [props.href] - "See all" link
 * @param {boolean} [props.ranked=false] - Show chart numbers
 * @param {string} [props.emptyText="Nothing here yet."]
 */
export default function TrackShelf({
  title,
  subtitle,
  query,
  items,
  source = "browse",
  showReason = false,
  onNotInterested,
  href,
  ranked = false,
  emptyText = "Nothing here yet.",
}) {
  const scroller = useRef(null);
  const playQueue = usePlayerStore((state) => state.playQueue);
  const tracks = items ?? query.data?.items ?? [];

  /** Scroll by most of a screen width. */
  const scrollBy = (direction) => {
    const element = scroller.current;
    if (element)
      element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <FadeIn className="mb-7 sm:mb-10">
      <section aria-label={title}>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
              {title}
            </h2>
            {subtitle && <p className="truncate text-xs text-fg-muted sm:text-sm">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {tracks.length > 0 && (
              <button
                type="button"
                onClick={() => playQueue(tracks, 0, { source })}
                aria-label={`Play ${title}`}
                className="flex size-11 items-center justify-center rounded-full text-neon transition hover:bg-neon-dim"
              >
                <Play size={18} fill="currentColor" aria-hidden />
              </button>
            )}
            {href && (
              <Link
                href={href}
                className="inline-flex min-h-11 items-center px-2 text-sm text-fg-muted hover:text-neon"
              >
                See all
              </Link>
            )}
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label={`Scroll ${title} left`}
              className="hidden size-11 items-center justify-center rounded-full text-fg-muted transition hover:bg-neon-dim hover:text-neon md:flex"
            >
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label={`Scroll ${title} right`}
              className="hidden size-11 items-center justify-center rounded-full text-fg-muted transition hover:bg-neon-dim hover:text-neon md:flex"
            >
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
        </div>

        {query.isPending ? (
          <div
            className="no-scrollbar -mx-4 flex gap-4 overflow-hidden px-4 md:mx-0 md:px-0"
            aria-busy="true"
          >
            {Array.from({ length: SKELETON_CARDS }, (_, index) => (
              <div key={index} className={CARD_CLASS}>
                <Skeleton className="aspect-square w-full rounded-card" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-dashed border-line px-4 py-6 text-sm text-fg-muted">
            <span className="text-danger">Couldn&apos;t load {title.toLowerCase()}</span>
            <Button variant="outline" onClick={() => query.refetch()}>
              Try again
            </Button>
          </div>
        ) : tracks.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-4 py-6 text-sm text-fg-muted">
            {emptyText}
          </p>
        ) : (
          <div
            ref={scroller}
            className="no-scrollbar -mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 md:mx-0 md:scroll-px-0 md:px-0"
          >
            <Stagger className="flex gap-4 pb-2" stagger={0.04}>
              {tracks.map((track, index) => (
                <StaggerItem key={track.id} className={CARD_CLASS}>
                  <TrackCard
                    track={track}
                    tracks={tracks}
                    index={index}
                    rank={ranked ? index + 1 : undefined}
                    source={source}
                    reason={showReason ? track.reason : undefined}
                    onNotInterested={onNotInterested}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        )}
      </section>
    </FadeIn>
  );
}
