"use client";

/**
 * Search-and-pick an artist for a track (Admin Console). Shows the chosen
 * artist with "Change"; while searching, lists up to 8 matches.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Search } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { listAdminArtists } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";

const RESULT_LIMIT = 8;

/**
 * @param {Object} props
 * @param {Object|null} props.value - Selected artist ({ id, stageName, avatar, verified })
 * @param {(artist: Object|null) => void} props.onChange
 * @param {string} [props.error]
 * @param {string} [props.label="Artist"]
 */
export default function ArtistPicker({ value, onChange, error, label = "Artist" }) {
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(!value);
  const q = useDebouncedValue(search.trim(), 300);
  const query = { q: q || undefined, limit: RESULT_LIMIT };

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEYS.adminArtists(query),
    queryFn: ({ signal }) => listAdminArtists(query, { signal }),
    enabled: isSearching,
  });

  if (value && !isSearching) {
    return (
      <div>
        <p className="text-sm text-fg-muted">{label}</p>
        <div className="mt-1.5 flex min-h-14 items-center gap-3 rounded-control border border-line-strong bg-black px-3">
          <Avatar name={value.stageName} src={value.avatar} size="sm" />
          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm text-fg">
            {value.stageName}
            {value.verified && (
              <BadgeCheck size={14} className="shrink-0 text-neon" aria-label="Verified" />
            )}
          </span>
          <button
            type="button"
            onClick={() => setIsSearching(true)}
            className="min-h-11 rounded-lg px-3 text-sm text-neon hover:bg-neon-dim"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  const artists = data?.artists ?? [];
  return (
    <div>
      <TextField
        label={label}
        icon={Search}
        type="search"
        placeholder="Search artists"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        error={error}
      />
      <div className="mt-2 max-h-72 overflow-y-auto rounded-control border border-line bg-black">
        {isPending ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : artists.length === 0 ? (
          <p className="p-4 text-sm text-fg-muted">
            No artist found. Create one under Artists &amp; Albums first.
          </p>
        ) : (
          <ul role="listbox" aria-label="Artists">
            {artists.map((artist) => (
              <li key={artist.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.id === artist.id}
                  onClick={() => {
                    onChange(artist);
                    setIsSearching(false);
                    setSearch("");
                  }}
                  className="flex min-h-12 w-full items-center gap-3 px-3 text-left text-sm transition hover:bg-neon-dim"
                >
                  <Avatar name={artist.stageName} src={artist.avatar} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{artist.stageName}</span>
                  <span className="text-xs text-fg-subtle">
                    {artist.trackCount ?? 0} {artist.trackCount === 1 ? "track" : "tracks"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => setIsSearching(false)}
          className="mt-1 min-h-11 text-xs text-fg-subtle hover:text-neon"
        >
          Keep {value.stageName}
        </button>
      )}
    </div>
  );
}
