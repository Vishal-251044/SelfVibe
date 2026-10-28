"use client";

/**
 * Admin Console → Artists & Albums (/admin/artists, PRD MUS-4): search
 * artists, see track counts, create official artists.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Disc3, Plus, Search } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import ArtistFormSheet from "@/components/features/admin/artists/ArtistFormSheet";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { listAdminArtists } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";

const PAGE_SIZE = 30;
const KIND_OPTIONS = [
  { value: "all", label: "All artists" },
  { value: "official", label: "Official (staff-managed)" },
];

export default function AdminArtistList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const q = useDebouncedValue(search.trim(), 350);
  const query = {
    q: q || undefined,
    official: kind === "official" ? true : undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEYS.adminArtists(query),
    queryFn: ({ signal }) => listAdminArtists(query, { signal }),
    placeholderData: (previous) => previous,
  });
  const artists = data?.artists ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Admin panel"
        title="Artists & Albums"
        subtitle={
          data?.meta ? `${data.meta.total} artists` : "Official artists, creators and their albums"
        }
        actions={
          <Button onClick={() => setIsCreating(true)}>
            <Plus size={16} aria-hidden /> New artist
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TextField
          label="Search"
          icon={Search}
          type="search"
          placeholder="Artist name"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <SelectField
          label="Show"
          options={KIND_OPTIONS}
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={Disc3}
          title="couldn't load artists"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : artists.length === 0 ? (
        <EmptyState
          icon={Disc3}
          title="no artists found"
          description={q ? "Try a different name." : "Create the first artist."}
          action={<Button onClick={() => setIsCreating(true)}>New artist</Button>}
        />
      ) : (
        <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" stagger={0.02} inView={false}>
          {artists.map((artist) => (
            <StaggerItem key={artist.id}>
              <Link
                href={`/admin/artists/${artist.id}`}
                className="flex min-h-20 items-center gap-3 rounded-card border border-line bg-surface p-3 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-glow-sm"
              >
                <Avatar name={artist.stageName} src={artist.avatar} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium">
                    {artist.stageName}
                    {artist.verified && (
                      <BadgeCheck size={14} className="shrink-0 text-neon" aria-label="Verified" />
                    )}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    {artist.trackCount ?? 0} {artist.trackCount === 1 ? "track" : "tracks"}
                    {artist.country ? ` · ${artist.country}` : ""}
                  </p>
                </div>
                {!artist.isOfficial && <Badge tone="info">Creator</Badge>}
                <ChevronRight size={18} className="shrink-0 text-fg-subtle" aria-hidden />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} disabled={isFetching} />

      {isCreating && (
        <ArtistFormSheet
          open={isCreating}
          onClose={() => setIsCreating(false)}
          onSaved={(artist) => {
            setIsCreating(false);
            queryClient.invalidateQueries({ queryKey: ["admin", "artists"] });
            router.push(`/admin/artists/${artist.id}`);
          }}
        />
      )}
    </>
  );
}
