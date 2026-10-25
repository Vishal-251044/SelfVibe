"use client";

/**
 * Browse by Genre / by Vibe grid (PRD BRW-1/2, roadmap Day 7). Reads the
 * staff-managed list from the API (with counts for the chosen catalog), with
 * skeleton, error and empty states.
 */
import { useQuery } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import CategoryTile from "@/components/features/browse/CategoryTile";
import { getCategories } from "@/services/browse.service";
import { useCatalogFilter } from "@/hooks/useCatalogFilter";
import { QUERY_KEYS } from "@/utils/constants";

const GRID = "grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4";

/**
 * @param {Object} props
 * @param {"genre"|"vibe"} props.kind
 * @param {string} props.title
 * @param {string} [props.command]
 */
export default function CategoryGrid({ kind, title, command }) {
  const { catalog } = useCatalogFilter();
  const query = useQuery({
    queryKey: QUERY_KEYS.categories(kind, catalog),
    queryFn: ({ signal }) => getCategories(kind, catalog, { signal }),
    staleTime: 5 * 60 * 1000,
  });
  const items = query.data?.items ?? [];

  return (
    <section aria-labelledby={`browse-${kind}`} className="mb-7 sm:mb-10">
      {command && <p className="font-mono text-[11px] text-neon sm:text-xs">$ {command}</p>}
      <h2
        id={`browse-${kind}`}
        className="mb-4 font-display text-lg font-bold tracking-tight sm:text-xl"
      >
        {title}
      </h2>
      {query.isPending ? (
        <div className={GRID} aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="aspect-[16/10] w-full rounded-card lg:aspect-[2/1]" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={Compass}
          command={`selfvibe browse --${kind}s`}
          title={`couldn't load ${kind}s`}
          description={query.error?.message}
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Compass}
          command={`selfvibe browse --${kind}s`}
          title={`no ${kind}s yet`}
        />
      ) : (
        <Stagger className={GRID} stagger={0.03}>
          {items.map((item) => (
            <StaggerItem key={item.slug} className="h-full">
              <CategoryTile kind={kind} item={item} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}
