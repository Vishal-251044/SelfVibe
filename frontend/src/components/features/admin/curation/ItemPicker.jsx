"use client";

/**
 * Pick songs or artists for curation (featured rows, editorial playlists):
 * search, add, reorder with arrows, remove. Uses the public search API.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import TextField from "@/components/ui/TextField";
import Avatar from "@/components/ui/Avatar";
import CoverArt from "@/components/features/music/CoverArt";
import { search } from "@/services/search.service";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { QUERY_KEYS } from "@/utils/constants";

/**
 * @param {Object} props
 * @param {"tracks"|"artists"} props.kind
 * @param {Array<{ id: string, label: string, sublabel?: string, imageUrl?: string|null }>} props.value
 * @param {(items: Array<Object>) => void} props.onChange
 * @param {number} [props.max=30]
 */
export default function ItemPicker({ kind, value, onChange, max = 30 }) {
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim(), 300);
  const { data, isFetching } = useQuery({
    queryKey: QUERY_KEYS.search(q, "all"),
    queryFn: ({ signal }) => search(q, "all", { signal }),
    enabled: q.length > 0,
    staleTime: 30 * 1000,
  });
  const chosen = new Set(value.map((item) => item.id));
  const results = (kind === "tracks" ? data?.tracks : data?.artists) ?? [];
  const toItem = (result) =>
    kind === "tracks"
      ? {
          id: result.id,
          label: result.title,
          sublabel: result.artist?.stageName ?? "",
          imageUrl: result.coverUrl,
        }
      : {
          id: result.id,
          label: result.stageName,
          sublabel: result.isOfficial ? "Official artist" : "Creator",
          imageUrl: result.avatar,
        };

  const move = (from, to) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  const iconButton =
    "flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted hover:text-neon disabled:opacity-30";

  return (
    <div className="space-y-3">
      <TextField
        label={`Add ${kind === "tracks" ? "songs" : "artists"}`}
        icon={Search}
        type="search"
        placeholder={kind === "tracks" ? "Song or artist name" : "Artist name"}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {q && (
        <ul
          className="max-h-56 space-y-1 overflow-y-auto rounded-control border border-line p-1"
          aria-busy={isFetching}
        >
          {results.length === 0 ? (
            <li className="p-3 text-xs text-fg-subtle">
              {isFetching ? "Searching…" : "No matches"}
            </li>
          ) : (
            results.map((result) => {
              const item = toItem(result);
              const isChosen = chosen.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={isChosen || value.length >= max}
                    onClick={() => onChange([...value, item])}
                    className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition hover:bg-surface-raised disabled:opacity-40"
                  >
                    {kind === "tracks" ? (
                      <CoverArt
                        src={item.imageUrl}
                        alt=""
                        seed={item.id}
                        className="size-9 rounded-md"
                        sizes="36px"
                      />
                    ) : (
                      <Avatar name={item.label} src={item.imageUrl} size="sm" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{item.label}</span>
                      <span className="block truncate text-xs text-fg-subtle">{item.sublabel}</span>
                    </span>
                    {isChosen ? (
                      <span className="text-xs text-neon">Added</span>
                    ) : (
                      <Plus size={16} className="text-neon" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
      <div>
        <p className="mb-2 text-xs text-fg-subtle">
          {value.length} of {max} {kind === "tracks" ? "songs" : "artists"} (in this order)
        </p>
        {value.length > 0 && (
          <ol className="space-y-1">
            {value.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface-raised pl-2"
              >
                <span className="w-5 text-xs font-semibold text-neon tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move ${item.label} up`}
                >
                  <ArrowUp size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => move(index, index + 1)}
                  disabled={index === value.length - 1}
                  aria-label={`Move ${item.label} down`}
                >
                  <ArrowDown size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className={`${iconButton} hover:text-danger`}
                  onClick={() => onChange(value.filter((other) => other.id !== item.id))}
                  aria-label={`Remove ${item.label}`}
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
