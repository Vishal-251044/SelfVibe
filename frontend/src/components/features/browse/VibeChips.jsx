"use client";

/**
 * Horizontally scrollable row of vibe chips (swipe-friendly on phones,
 * wraps on wider screens). Vibes come from the staff-managed list (Admin →
 * Genres & Vibes); each chip opens that vibe's page.
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@/components/ui/Skeleton";
import TaxonomyIcon from "@/components/ui/TaxonomyIcon";
import { getCategories } from "@/services/browse.service";
import { useCatalogFilter } from "@/hooks/useCatalogFilter";
import { QUERY_KEYS } from "@/utils/constants";

export default function VibeChips() {
  const { catalog } = useCatalogFilter();
  const query = useQuery({
    queryKey: QUERY_KEYS.categories("vibe", catalog),
    queryFn: ({ signal }) => getCategories("vibe", catalog, { signal }),
    staleTime: 5 * 60 * 1000,
  });

  if (query.isError) return null; // optional shortcut row — the page still works without it

  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      {query.isPending
        ? Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-24 shrink-0 rounded-full" />
          ))
        : (query.data?.items ?? []).map((vibe) => (
            <Link
              key={vibe.slug}
              href={`/browse/vibe/${vibe.slug}`}
              className="inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-fg-muted transition hover:border-neon hover:text-neon hover:shadow-glow-sm"
            >
              <TaxonomyIcon name={vibe.icon} size={16} style={{ color: vibe.colour }} aria-hidden />
              {vibe.name}
            </Link>
          ))}
    </div>
  );
}
