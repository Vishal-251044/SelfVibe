"use client";

/**
 * Staff-curated Home rows (roadmap Day 9 Curation): featured songs, featured
 * artists and editorial playlists, in the order staff arranged them.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import FadeIn from "@/components/animations/FadeIn";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackShelf from "@/components/features/browse/TrackShelf";
import PlaylistCover from "@/components/features/playlist/PlaylistCover";
import { hoverLift } from "@/utils/animations";
import { pluralize } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {Object[]} props.sections - Non-hero sections from GET /home/sections
 * @param {Object} props.query - The sections query (loading / error state)
 */
export default function CuratedRows({ sections, query }) {
  return sections.map((section) => {
    if (section.type === "featuredTracks") {
      return (
        <TrackShelf
          key={section.id}
          title={section.title}
          subtitle={section.subtitle}
          command="selfvibe picks --staff"
          query={query}
          items={section.tracks}
          source="feed"
        />
      );
    }
    if (section.type === "featuredArtists") {
      return (
        <FadeIn key={section.id} className="mb-10">
          <section aria-label={section.title}>
            <p className="font-mono text-xs text-neon">$ selfvibe artists --featured</p>
            <h2 className="font-display text-xl font-bold sm:text-2xl">{section.title}</h2>
            {section.subtitle && (
              <p className="text-xs text-fg-muted sm:text-sm">{section.subtitle}</p>
            )}
            <Stagger
              className="no-scrollbar -mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
              stagger={0.04}
            >
              {section.artists.map((artist) => (
                <StaggerItem key={artist.id} className="w-28 shrink-0 snap-start sm:w-36">
                  <motion.div whileHover={hoverLift}>
                    <Link
                      href={`/artist/${artist.slug ?? artist.id}`}
                      className="group flex flex-col items-center gap-2 text-center"
                    >
                      <Avatar
                        name={artist.stageName}
                        src={artist.avatar}
                        size="xl"
                        className="size-24 transition group-hover:shadow-glow sm:size-32"
                      />
                      <span className="flex max-w-full items-center gap-1 text-sm font-semibold">
                        <span className="truncate">{artist.stageName}</span>
                        {artist.verified && (
                          <BadgeCheck
                            size={14}
                            className="shrink-0 text-neon"
                            aria-label="Verified"
                          />
                        )}
                      </span>
                    </Link>
                  </motion.div>
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        </FadeIn>
      );
    }
    // Editorial playlist: one wide card
    return (
      <FadeIn key={section.id} className="mb-10">
        <section aria-label={section.title}>
          <p className="font-mono text-xs text-neon">$ selfvibe playlist --editorial</p>
          <h2 className="mb-4 font-display text-xl font-bold sm:text-2xl">{section.title}</h2>
          <motion.div whileHover={hoverLift}>
            <Link
              href={`/playlist/${section.playlist.id}`}
              className="flex items-center gap-4 rounded-card border border-line bg-[linear-gradient(120deg,rgb(34_197_94/0.14),transparent_60%)] p-3 transition hover:border-line-strong hover:shadow-glow-sm sm:p-4"
            >
              <PlaylistCover
                playlist={section.playlist}
                className="size-24 shrink-0 rounded-lg sm:size-32"
                sizes="128px"
              />
              <span className="min-w-0">
                <span className="text-xs tracking-widest text-neon uppercase">
                  SelfVibe playlist
                </span>
                <span className="block truncate font-display text-lg font-bold sm:text-2xl">
                  {section.playlist.name}
                </span>
                <span className="line-clamp-2 text-sm text-fg-muted">
                  {section.subtitle || section.playlist.description}
                </span>
                <span className="mt-1 block text-xs text-fg-subtle">
                  {pluralize(section.playlist.trackCount, "song")}
                </span>
              </span>
            </Link>
          </motion.div>
        </section>
      </FadeIn>
    );
  });
}
