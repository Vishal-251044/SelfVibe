"use client";

/**
 * Grouped search results (PRD SRC-1): Songs · Artists · Playlists ·
 * Genres & Vibes, each group only when it has results.
 */
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, SearchX } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import TaxonomyIcon from "@/components/ui/TaxonomyIcon";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackRow from "@/components/features/music/TrackRow";
import PlaylistCard from "@/components/features/playlist/PlaylistCard";
import { SEARCH_TRACKS_PREVIEW } from "@/utils/musicConstants";
import { hoverLift } from "@/utils/animations";

/**
 * @param {{ id: string, title: string, children: React.ReactNode, action?: React.ReactNode }} props
 */
function Group({ id, title, children, action }) {
  return (
    <section aria-labelledby={`results-${id}`} className="mb-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={`results-${id}`} className="font-display text-xl font-bold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * @param {Object} props
 * @param {{ query: string, tracks: Object[], artists: Object[], playlists: Object[], categories: Object[] }} props.results
 */
export default function SearchResults({ results }) {
  const [showAllTracks, setShowAllTracks] = useState(false);
  const { tracks, artists, playlists, categories } = results;
  const isEmpty = !tracks.length && !artists.length && !playlists.length && !categories.length;

  if (isEmpty) {
    return (
      <EmptyState
        icon={SearchX}
        command={`selfvibe search "${results.query}"`}
        title={`No match for '${results.query}'`}
        description="Check the spelling, try fewer words, or search for an artist, a genre or a vibe."
      />
    );
  }

  const visibleTracks = showAllTracks ? tracks : tracks.slice(0, SEARCH_TRACKS_PREVIEW);

  return (
    <>
      {tracks.length > 0 && (
        <Group
          id="songs"
          title="Songs"
          action={
            tracks.length > SEARCH_TRACKS_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAllTracks((value) => !value)}
                className="min-h-11 px-2 text-sm text-fg-muted hover:text-neon"
              >
                {showAllTracks ? "Show less" : `Show all ${tracks.length}`}
              </button>
            )
          }
        >
          <Stagger className="space-y-1" stagger={0.03} inView={false}>
            {visibleTracks.map((track, index) => (
              <StaggerItem key={track.id}>
                <TrackRow
                  track={track}
                  tracks={tracks}
                  index={index + 1}
                  playable
                  showQueueMenu
                  showCatalog
                  source="search"
                />
              </StaggerItem>
            ))}
          </Stagger>
        </Group>
      )}

      {artists.length > 0 && (
        <Group id="artists" title="Artists">
          <Stagger
            className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
            stagger={0.04}
            inView={false}
          >
            {artists.map((artist) => (
              <StaggerItem key={artist.id} className="w-28 shrink-0 snap-start sm:w-32">
                <motion.div whileHover={hoverLift}>
                  <Link
                    href={`/artist/${artist.slug ?? artist.id}`}
                    className="group flex flex-col items-center gap-2 rounded-card p-2 text-center"
                  >
                    <Avatar
                      name={artist.stageName}
                      src={artist.avatar}
                      size="xl"
                      className="size-24 transition group-hover:shadow-glow-sm sm:size-28"
                    />
                    <span className="flex max-w-full items-center gap-1 text-sm font-semibold text-fg">
                      <span className="truncate">{artist.stageName}</span>
                      {artist.verified && (
                        <BadgeCheck
                          size={14}
                          className="shrink-0 text-neon"
                          aria-label="Verified"
                        />
                      )}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      {artist.isOfficial ? "Artist" : "Creator"}
                    </span>
                  </Link>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </Group>
      )}

      {playlists.length > 0 && (
        <Group id="playlists" title="Playlists">
          <Stagger
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"
            stagger={0.04}
            inView={false}
          >
            {playlists.map((playlist) => (
              <StaggerItem key={playlist.id} className="h-full">
                <PlaylistCard playlist={playlist} />
              </StaggerItem>
            ))}
          </Stagger>
        </Group>
      )}

      {categories.length > 0 && (
        <Group id="categories" title="Genres & Vibes">
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={`${category.kind}-${category.slug}`}>
                <Link
                  href={`/browse/${category.kind}/${category.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-fg transition hover:border-neon hover:shadow-glow-sm"
                >
                  <TaxonomyIcon
                    name={category.icon}
                    size={16}
                    style={{ color: category.colour }}
                    aria-hidden
                  />
                  {category.name}
                  <span className="text-xs text-fg-subtle capitalize">{category.kind}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Group>
      )}
    </>
  );
}
