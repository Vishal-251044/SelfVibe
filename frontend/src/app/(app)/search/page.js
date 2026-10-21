/**
 * Search (/search): search box plus Browse-by-vibe grid.
 * Live, typo-tolerant search results are wired on Day 7.
 */
import Link from "next/link";
import { Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import FadeIn from "@/components/animations/FadeIn";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { VIBES } from "@/utils/constants";

export const metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <>
      <PageHeader eyebrow="selfvibe search" title="Search" />

      <FadeIn className="mb-10">
        <form role="search" action="/search">
          <label htmlFor="search-input" className="sr-only">
            Search tracks, artists, playlists and genres
          </label>
          <div className="flex min-h-14 items-center gap-3 rounded-control border border-line bg-black px-4 transition focus-within:border-neon focus-within:shadow-glow-sm">
            <Search size={20} className="shrink-0 text-neon" aria-hidden />
            <input
              id="search-input"
              name="q"
              type="search"
              placeholder="Tracks, artists, playlists, genres"
              autoComplete="off"
              className="w-full min-w-0 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
            />
          </div>
        </form>
      </FadeIn>

      <section aria-labelledby="browse-heading">
        <h2 id="browse-heading" className="mb-5 font-display text-xl font-bold sm:text-2xl">
          Browse by vibe
        </h2>
        <Stagger
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
          inView={false}
        >
          {VIBES.map(({ name, slug, icon: Icon, blurb }) => (
            <StaggerItem key={slug}>
              <Link
                href={`/search?vibe=${slug}`}
                className="group relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-card border border-line bg-surface p-4 transition duration-300 hover:border-neon hover:shadow-glow-lg sm:p-5"
              >
                <Icon
                  size={64}
                  className="absolute -right-3 -bottom-3 text-neon/10 transition group-hover:text-neon/25"
                  aria-hidden
                />
                <Icon size={22} className="text-neon" aria-hidden />
                <div>
                  <p className="font-display text-lg font-bold sm:text-xl">{name}</p>
                  <p className="line-clamp-1 text-xs text-fg-muted">{blurb}</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}
