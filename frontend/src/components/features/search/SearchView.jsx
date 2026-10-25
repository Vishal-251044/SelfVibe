"use client";

/**
 * Search (/search, PRD SRC-1/2/3, roadmap Day 7): search-as-you-type with a
 * 300 ms debounce, typo-tolerant grouped results, the catalog switch, voice
 * (mic + language), recent searches, and Browse by Vibe / Genre when the box
 * is empty. The query lives in the URL (?q=) so results can be shared and
 * survive Back.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FadeIn from "@/components/animations/FadeIn";
import MicButton from "@/components/features/voice/MicButton";
import VoiceSettings from "@/components/features/voice/VoiceSettings";
import CatalogSwitch from "@/components/features/browse/CatalogSwitch";
import CategoryGrid from "@/components/features/browse/CategoryGrid";
import RecentSearches from "@/components/features/search/RecentSearches";
import SearchResults from "@/components/features/search/SearchResults";
import { addRecentSearch, search } from "@/services/search.service";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCatalogFilter } from "@/hooks/useCatalogFilter";
import { QUERY_KEYS } from "@/utils/constants";
import { SEARCH_DEBOUNCE_MS } from "@/utils/musicConstants";

/** Placeholder rows while results load. */
function ResultsSkeleton() {
  return (
    <div aria-busy="true" className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="mb-4 h-6 w-24" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-control" />
        ))}
      </div>
      <div className="flex gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="size-24 shrink-0 rounded-full sm:size-28" />
        ))}
      </div>
    </div>
  );
}

export default function SearchView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const { catalog } = useCatalogFilter();
  const [text, setText] = useState(() => searchParams.get("q") ?? "");
  const debounced = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);

  // Keep ?q= in step with what's being searched (replace: no history spam)
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (current === debounced) return;
    router.replace(debounced ? `${pathname}?q=${encodeURIComponent(debounced)}` : pathname, {
      scroll: false,
    });
  }, [debounced, pathname, router, searchParams]);

  const query = useQuery({
    queryKey: QUERY_KEYS.search(debounced, catalog),
    queryFn: ({ signal }) => search(debounced, catalog, { signal }),
    enabled: debounced.length > 0,
    placeholderData: keepPreviousData, // no flash between keystrokes
    staleTime: 30 * 1000,
  });

  /** Remember a search the user acted on (SRC-3). */
  const remember = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    addRecentSearch(trimmed)
      .then((data) => queryClient.setQueryData(QUERY_KEYS.recentSearches, data))
      .catch(() => {});
  };

  const runSearch = (value) => {
    setText(value);
    inputRef.current?.focus();
  };

  const hasQuery = text.trim().length > 0;
  const isTyping = hasQuery && (text.trim() !== debounced || query.isFetching);

  return (
    <>
      <PageHeader eyebrow="selfvibe search" title="Search" />

      <FadeIn className="sticky top-14 z-30 -mx-4 mb-5 flex flex-col gap-2.5 bg-ink/85 px-4 pt-1 pb-3 backdrop-blur-xl md:top-[var(--top-nav-height)] md:mx-0 md:mb-6 md:flex-row md:items-center md:gap-3 md:px-0">
        <form
          className="min-w-0 md:flex-1"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            remember(text);
            inputRef.current?.blur(); // hide the phone keyboard
          }}
        >
          <label htmlFor="search-input" className="sr-only">
            Search songs, artists, playlists, genres and vibes
          </label>
          <div className="flex h-12 items-center gap-2 rounded-full border border-white/10 bg-surface-raised pr-0.5 pl-4 transition focus-within:border-neon/70 focus-within:bg-black focus-within:shadow-glow-sm md:h-11 md:pr-0">
            {isTyping ? (
              <Loader2 size={18} className="shrink-0 animate-spin text-neon" aria-hidden />
            ) : (
              <Search size={18} className="shrink-0 text-fg-muted" aria-hidden />
            )}
            <input
              ref={inputRef}
              id="search-input"
              type="search"
              enterKeyHint="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What do you want to hear?"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={100}
              className="w-full min-w-0 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle md:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => runSearch("")}
                aria-label="Clear search"
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-subtle hover:text-fg"
              >
                <X size={18} aria-hidden />
              </button>
            )}
            {/* 44px button; the green circle is painted 36px (bg-clip-content) */}
            <MicButton variant="filled" size={18} className="bg-clip-content p-1" />
          </div>
        </form>
        <div className="flex items-center justify-between gap-2 md:shrink-0 md:justify-end md:gap-3">
          <CatalogSwitch />
          <VoiceSettings />
        </div>
      </FadeIn>

      {/* Clicking any result counts as using this search */}
      <div
        onClickCapture={(event) =>
          hasQuery && event.target.closest("a, button") && remember(debounced)
        }
      >
        {!hasQuery ? (
          <>
            <RecentSearches onSelect={runSearch} />
            <CategoryGrid kind="vibe" title="Browse by vibe" command="selfvibe browse --vibes" />
            <CategoryGrid kind="genre" title="Browse by genre" command="selfvibe browse --genres" />
          </>
        ) : query.isError ? (
          <EmptyState
            icon={Search}
            command={`selfvibe search "${debounced}"`}
            title="search is having a moment"
            description={query.error?.message}
            action={<Button onClick={() => query.refetch()}>Try again</Button>}
          />
        ) : !query.data ? (
          <ResultsSkeleton />
        ) : (
          <SearchResults key={query.data.query} results={query.data} />
        )}
      </div>
    </>
  );
}
