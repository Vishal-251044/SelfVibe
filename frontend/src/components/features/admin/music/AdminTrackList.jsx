"use client";

/**
 * Admin Console → Music (/admin/music, PRD MUS-1/3): search and filter the
 * whole catalog, preview tracks, open one to edit. Polls while tracks process.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Files, Loader2, Music4, Plus, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackRow from "@/components/features/music/TrackRow";
import TrackStatusBadge from "@/components/features/music/TrackStatusBadge";
import { useHasPermission } from "@/components/features/admin/RequirePermission";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { listAdminTracks } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";
import { CATALOG_META, PROCESSING_POLL_MS, TRACK_STATUS_META } from "@/utils/musicConstants";

const PAGE_SIZE = 25;
const STATUS_OPTIONS = Object.entries(TRACK_STATUS_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));
const CATALOG_OPTIONS = Object.entries(CATALOG_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));
const PROCESSING_OPTIONS = [
  { value: "running", label: "Processing now" },
  { value: "queued", label: "Queued" },
  { value: "failed", label: "Failed" },
  { value: "done", label: "Ready" },
];

export default function AdminTrackList() {
  const canAddMusic = useHasPermission("music.manage");
  const taxonomy = useTaxonomy("staff");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ catalog: "", status: "", processing: "", genre: "" });
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 350);

  const query = { q: q || undefined, page, limit: PAGE_SIZE };
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query[key] = value;
  });

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEYS.adminTracks(query),
    queryFn: ({ signal }) => listAdminTracks(query, { signal }),
    placeholderData: (previous) => previous,
    refetchInterval: (state) =>
      state.state.data?.tracks?.some((track) =>
        ["queued", "running"].includes(track.processing?.state)
      )
        ? PROCESSING_POLL_MS
        : false,
  });

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const tracks = data?.tracks ?? [];
  const hasFilters = Boolean(q || Object.values(filters).some(Boolean));

  return (
    <>
      <PageHeader
        eyebrow="Admin panel"
        title="Music"
        subtitle={
          data?.meta ? `${data.meta.total} tracks in the catalog` : "Every track in the catalog"
        }
        actions={
          canAddMusic && (
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <Button
                href="/admin/music/bulk"
                variant="outline"
                className="px-3 whitespace-nowrap sm:px-5"
              >
                <Files size={16} aria-hidden /> Bulk upload
              </Button>
              <Button href="/admin/music/new" className="px-3 whitespace-nowrap sm:px-5">
                <Plus size={16} aria-hidden /> Add track
              </Button>
            </div>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <TextField
          label="Search"
          icon={Search}
          type="search"
          placeholder="Track title"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <SelectField
          label="Catalog"
          placeholder="All"
          options={CATALOG_OPTIONS}
          value={filters.catalog}
          onChange={(event) => setFilter("catalog", event.target.value)}
        />
        <SelectField
          label="Status"
          placeholder="All"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(event) => setFilter("status", event.target.value)}
        />
        <SelectField
          label="Processing"
          placeholder="All"
          options={PROCESSING_OPTIONS}
          value={filters.processing}
          onChange={(event) => setFilter("processing", event.target.value)}
        />
        <SelectField
          label="Genre"
          placeholder="All"
          options={taxonomy.genres.map((genre) => ({ value: genre.slug, label: genre.name }))}
          value={filters.genre}
          onChange={(event) => setFilter("genre", event.target.value)}
        />
      </div>

      <section
        className="rounded-card border border-line bg-surface p-2 sm:p-3"
        aria-label="Tracks"
      >
        {isFetching && !isPending && (
          <Loader2
            size={16}
            className="float-right m-2 animate-spin text-fg-subtle"
            aria-label="Refreshing"
          />
        )}
        {isPending ? (
          <div className="space-y-2 p-1" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-control" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={Music4}
            title="couldn't load tracks"
            description={error?.message}
            action={<Button onClick={() => refetch()}>Try again</Button>}
            className="border-0"
          />
        ) : tracks.length === 0 ? (
          <EmptyState
            icon={Music4}
            title={hasFilters ? "no tracks match" : "the catalog is empty"}
            description={
              hasFilters
                ? "Try a different search or clear the filters."
                : "Add a track, bulk upload, or run `npm run import:catalog` on the server."
            }
            action={
              canAddMusic && !hasFilters && <Button href="/admin/music/new">Add track</Button>
            }
            className="border-0"
          />
        ) : (
          <Stagger className="space-y-1" stagger={0.02} inView={false}>
            {tracks.map((track) => (
              <StaggerItem key={track.id}>
                <TrackRow
                  track={track}
                  href={`/admin/music/${track.id}`}
                  showCatalog
                  tracks={tracks.filter((item) => item.bitrates?.length > 0)}
                  playable
                  scope="staff"
                  canPlay={track.bitrates?.length > 0}
                  status={<TrackStatusBadge track={track} />}
                  actions={
                    <Button
                      href={`/admin/music/${track.id}`}
                      variant="ghost"
                      aria-label={`Open ${track.title}`}
                      className="size-11 px-0"
                    >
                      <ChevronRight size={18} aria-hidden />
                    </Button>
                  }
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
      <Pagination meta={data?.meta} onPageChange={setPage} disabled={isFetching} />
    </>
  );
}
