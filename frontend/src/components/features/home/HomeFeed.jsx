"use client";

/**
 * Home / For You (roadmap Days 7–9, PRD 10.4.3, CAT-2/3):
 * - staff hero banners, the catalog switch and vibe shortcuts
 * - Daily Mix 1–3 and "Because you liked <song>" (Day 9)
 * - staff-curated rows: featured songs / artists, editorial playlists (Day 9)
 * - personal sections from the recommendation engine: Jump back in,
 *   Made for You, Right now: <vibe>, Trending, Fresh creators — each card
 *   says why it's there and can be marked "Not interested"
 * - New Releases, plus "SelfVibe Official" and "From the Community" rows
 */
import { useQuery } from "@tanstack/react-query";
import FadeIn from "@/components/animations/FadeIn";
import VibeChips from "@/components/features/browse/VibeChips";
import TrackShelf from "@/components/features/browse/TrackShelf";
import JumpBackIn from "@/components/features/home/JumpBackIn";
import HeroBanner from "@/components/features/home/HeroBanner";
import DailyMixRow from "@/components/features/home/DailyMixRow";
import CuratedRows from "@/components/features/home/CuratedRows";
import { getHomeSections } from "@/services/platform.service";
import { getNewReleases, getTrending } from "@/services/browse.service";
import { getForYouFeed } from "@/services/feed.service";
import { useCatalogFilter } from "@/hooks/useCatalogFilter";
import { useNotInterested } from "@/hooks/useNotInterested";
import { QUERY_KEYS } from "@/utils/constants";
import { HOME_ROW_SIZE } from "@/utils/musicConstants";

const ROW_STALE_MS = 5 * 60 * 1000;
/** Feed sections in display order, with their terminal eyebrow. */
const FEED_SECTIONS = [
  { key: "madeForYou", command: "selfvibe recommend --for-you" },
  { key: "becauseYouLiked", command: "selfvibe recommend --similar" },
  { key: "rightNow", command: "selfvibe vibe --now" },
  { key: "trending", command: "selfvibe trending --7d", ranked: true },
  { key: "freshCreators", command: "selfvibe discover --fresh-creators" },
];

/**
 * Trending songs for one catalog (the Official / Community rows).
 * @param {string} catalog
 * @param {boolean} enabled
 */
function useCatalogRow(catalog, enabled) {
  return useQuery({
    queryKey: QUERY_KEYS.trending(catalog),
    queryFn: ({ signal }) => getTrending({ catalog, limit: HOME_ROW_SIZE }, { signal }),
    staleTime: ROW_STALE_MS,
    enabled,
  });
}

export default function HomeFeed() {
  const { catalog } = useCatalogFilter();
  const hideTrack = useNotInterested();
  const feed = useQuery({
    queryKey: QUERY_KEYS.forYou(catalog),
    // The local hour picks "Right now: <vibe>" (late night → Chill / Sleep…)
    queryFn: ({ signal }) => getForYouFeed({ catalog, hour: new Date().getHours() }, { signal }),
    staleTime: ROW_STALE_MS,
  });
  const newReleases = useQuery({
    queryKey: QUERY_KEYS.newReleases(catalog),
    queryFn: ({ signal }) => getNewReleases({ catalog, limit: HOME_ROW_SIZE }, { signal }),
    staleTime: ROW_STALE_MS,
  });
  // The catalog rows only make sense when both catalogs are shown
  const showCatalogRows = catalog === "all";
  const official = useCatalogRow("official", showCatalogRows);
  const community = useCatalogRow("community", showCatalogRows);

  const curated = useQuery({
    queryKey: QUERY_KEYS.homeSections(catalog),
    queryFn: ({ signal }) => getHomeSections({ catalog }, { signal }),
    staleTime: ROW_STALE_MS,
  });
  const curatedSections = curated.data?.sections ?? [];

  const sections = feed.data?.sections ?? [];
  const sectionByKey = new Map(sections.map((section) => [section.key, section]));
  const jumpBackIn = sectionByKey.get("jumpBackIn");

  return (
    <>
      <HeroBanner banners={curatedSections.filter((section) => section.type === "hero")} />

      <FadeIn className="mb-7 sm:mb-9" delay={0.05}>
        <h2 className="mb-2 text-[13px] font-medium text-fg-muted">
          What&apos;s the vibe right now?
        </h2>
        <VibeChips />
      </FadeIn>

      {jumpBackIn && <JumpBackIn section={jumpBackIn} />}
      <DailyMixRow />

      {feed.isPending || feed.isError ? (
        // One placeholder row while loading; one retry row on error
        <TrackShelf
          title="Made for You"
          command="selfvibe recommend --for-you"
          query={feed}
          items={[]}
        />
      ) : (
        FEED_SECTIONS.filter(({ key }) => sectionByKey.get(key)?.items.length).map(
          ({ key, command, ranked }) => {
            const section = sectionByKey.get(key);
            return (
              <TrackShelf
                key={key}
                title={section.title}
                subtitle={section.subtitle}
                command={command}
                query={feed}
                items={section.items}
                source="feed"
                ranked={ranked}
                showReason={!ranked}
                onNotInterested={hideTrack}
                href={section.vibe ? `/browse/vibe/${section.vibe}` : undefined}
              />
            );
          }
        )
      )}

      <CuratedRows
        sections={curatedSections.filter((section) => section.type !== "hero")}
        query={curated}
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
