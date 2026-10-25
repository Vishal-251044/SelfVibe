"use client";

/**
 * Home sections (roadmap Day 7): the catalog switch, vibe shortcuts,
 * Trending (last 7 days), New Releases, and the "SelfVibe Official" and
 * "From the Community" rows (PRD CAT-2/3). The personalised For You rows
 * arrive with the recommendation engine on Day 8.
 */
import { useQuery } from "@tanstack/react-query";
import FadeIn from "@/components/animations/FadeIn";
import CatalogSwitch from "@/components/features/browse/CatalogSwitch";
import VibeChips from "@/components/features/browse/VibeChips";
import TrackShelf from "@/components/features/browse/TrackShelf";
import { getNewReleases, getTrending } from "@/services/browse.service";
import { useCatalogFilter } from "@/hooks/useCatalogFilter";
import { QUERY_KEYS } from "@/utils/constants";
import { HOME_ROW_SIZE } from "@/utils/musicConstants";

const ROW_STALE_MS = 5 * 60 * 1000;

/**
 * Trending songs for a catalog.
 * @param {string} catalog
 * @param {boolean} [enabled=true]
 */
function useTrending(catalog, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.trending(catalog),
    queryFn: ({ signal }) => getTrending({ catalog, limit: HOME_ROW_SIZE }, { signal }),
    staleTime: ROW_STALE_MS,
    enabled,
  });
}

export default function HomeFeed() {
  const { catalog } = useCatalogFilter();
  const trending = useTrending(catalog);
  const newReleases = useQuery({
    queryKey: QUERY_KEYS.newReleases(catalog),
    queryFn: ({ signal }) => getNewReleases({ catalog, limit: HOME_ROW_SIZE }, { signal }),
    staleTime: ROW_STALE_MS,
  });
  // The catalog rows only make sense when both catalogs are shown
  const showCatalogRows = catalog === "all";
  const official = useTrending("official", showCatalogRows);
  const community = useTrending("community", showCatalogRows);

  return (
    <>
      <FadeIn className="mb-8 flex flex-col gap-4" delay={0.05}>
        <CatalogSwitch className="self-start" />
        <div>
          <h2 className="mb-3 text-sm text-fg-muted">What&apos;s the vibe right now?</h2>
          <VibeChips />
        </div>
      </FadeIn>

      <TrackShelf
        title="Trending"
        command="selfvibe trending --7d"
        query={trending}
        ranked
        emptyText="No plays this week yet — be the first."
      />
      <TrackShelf
        title="New Releases"
        command="selfvibe releases --new"
        query={newReleases}
        emptyText="No new songs yet."
      />
      {showCatalogRows && (
        <>
          <TrackShelf
            title="SelfVibe Official"
            command="selfvibe catalog --official"
            query={official}
            emptyText="Official songs are on their way."
          />
          <TrackShelf
            title="From the Community"
            command="selfvibe catalog --community"
            query={community}
            emptyText="No community uploads yet — share yours in Creator Studio."
          />
        </>
      )}
    </>
  );
}
