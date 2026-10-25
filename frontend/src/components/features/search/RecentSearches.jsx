"use client";

/**
 * Recent searches (PRD SRC-3): newest first, tap to search again, remove one
 * or clear all. Saved on the account (last 10).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, X } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import { getRecentSearches, removeRecentSearch } from "@/services/search.service";
import { QUERY_KEYS } from "@/utils/constants";

/**
 * @param {Object} props
 * @param {(query: string) => void} props.onSelect
 */
export default function RecentSearches({ onSelect }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEYS.recentSearches,
    queryFn: ({ signal }) => getRecentSearches({ signal }),
  });
  const remove = useMutation({
    mutationFn: (text) => removeRecentSearch(text),
    // Show the change at once; the server answer replaces it
    onMutate: (text) => {
      queryClient.setQueryData(QUERY_KEYS.recentSearches, (current) => ({
        items: text ? (current?.items ?? []).filter((item) => item.query !== text) : [],
      }));
    },
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEYS.recentSearches, data),
    onError: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recentSearches }),
  });

  const items = query.data?.items ?? [];
  if (query.isError || (!query.isPending && items.length === 0)) return null;

  return (
    <section aria-labelledby="recent-heading" className="mb-7 sm:mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="recent-heading" className="font-display text-lg font-bold">
          Recent searches
        </h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => remove.mutate("")}
            className="min-h-11 px-2 text-sm text-fg-muted hover:text-neon"
          >
            Clear all
          </button>
        )}
      </div>
      {query.isPending ? (
        <div className="flex flex-wrap gap-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-28 rounded-full" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item.query}
              className="flex items-center rounded-full border border-line bg-surface"
            >
              <button
                type="button"
                onClick={() => onSelect(item.query)}
                className="flex min-h-11 items-center gap-2 pr-1 pl-4 text-sm text-fg-muted hover:text-fg"
              >
                <History size={14} className="text-neon" aria-hidden />
                <span className="max-w-[12rem] truncate">{item.query}</span>
              </button>
              <button
                type="button"
                onClick={() => remove.mutate(item.query)}
                aria-label={`Remove "${item.query}" from recent searches`}
                className="flex size-11 items-center justify-center rounded-full text-fg-subtle hover:text-danger"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
