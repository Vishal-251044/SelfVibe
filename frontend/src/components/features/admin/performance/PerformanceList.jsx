"use client";

/**
 * Console → Song performance (PRD 10.15.2, PRF-2/3, roadmap Day 9): every song
 * with plays, listeners, completion, skips, likes, saves, shares and comments
 * for a date range; Official / Community / AI filter, search, top or bottom
 * songs, Official-vs-Community totals and a CSV export. A table on desktop,
 * cards on phones.
 */
import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Download, LineChart, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import CoverArt from "@/components/features/music/CoverArt";
import StatCard from "@/components/features/admin/insights/StatCard";
import RangeTabs from "@/components/features/admin/insights/RangeTabs";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { exportPerformanceCsv, getPerformance } from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { QUERY_KEYS } from "@/utils/constants";
import { CATALOG_META } from "@/utils/musicConstants";
import { cn, formatCount, formatRate } from "@/utils/genericFunctions";

const PAGE_SIZE = 50;
const CATALOG_OPTIONS = [
  { value: "all", label: "All songs" },
  { value: "official", label: "Official" },
  { value: "community", label: "Community" },
  { value: "ai", label: "AI" },
];
const SORT_OPTIONS = [
  { value: "plays", label: "Plays" },
  { value: "listeners", label: "Listeners" },
  { value: "completionRate", label: "Completion rate" },
  { value: "skipRate", label: "Skip rate" },
  { value: "likes", label: "Likes" },
  { value: "saves", label: "Saves" },
  { value: "comments", label: "Comments" },
  { value: "publishedAt", label: "Release date" },
];
const COLUMNS = [
  { key: "plays", label: "Plays", format: formatCount },
  { key: "listeners", label: "Listeners", format: formatCount },
  { key: "completionRate", label: "Completion", format: (value) => formatRate(value) },
  { key: "skipRate", label: "Skips", format: (value) => formatRate(value) },
  { key: "likes", label: "Likes", format: formatCount },
  { key: "saves", label: "Saves", format: formatCount },
  { key: "shares", label: "Shares", format: formatCount },
  { key: "comments", label: "Comments", format: formatCount },
];

export default function PerformanceList() {
  const [range, setRange] = useState(30);
  const [catalog, setCatalog] = useState("all");
  const [sort, setSort] = useState("plays");
  const [order, setOrder] = useState("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const q = useDebouncedValue(search.trim(), 350);
  const query = { range, catalog, sort, order, page, limit: PAGE_SIZE, q: q || undefined };

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEYS.adminPerformance(query),
    queryFn: ({ signal }) => getPerformance(query, { signal }),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  const summary = data?.summary;

  /** Change a filter and go back to page 1. */
  const change = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      await exportPerformanceCsv({ range, catalog, q: q || undefined });
    } catch (exportError) {
      showToast({
        message: exportError?.message ?? "export failed",
        tone: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin panel"
        title="Song performance"
        subtitle="How every song is doing. Numbers update every hour."
        actions={
          <Button variant="outline" onClick={exportCsv} loading={isExporting}>
            <Download size={16} aria-hidden /> Export CSV
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <RangeTabs value={range} onChange={change(setRange)} />
      </div>

      {/* PRF-2: Official vs Community (vs AI) */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["all", "All songs"],
          ["official", "Official"],
          ["community", "Community"],
          ["ai", "AI"],
        ].map(([key, label]) => (
          <StatCard
            key={key}
            label={label}
            loading={isPending}
            value={formatCount(summary?.[key]?.plays ?? 0)}
            hint={
              summary
                ? `${summary[key].songs} songs · ${formatRate(summary[key].completionRate)} finish`
                : undefined
            }
          />
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto] lg:items-end">
        <TextField
          label="Search"
          icon={Search}
          type="search"
          placeholder="Song title"
          value={search}
          onChange={(event) => change(setSearch)(event.target.value)}
        />
        <SelectField
          label="Songs"
          options={CATALOG_OPTIONS}
          value={catalog}
          onChange={(event) => change(setCatalog)(event.target.value)}
        />
        <SelectField
          label="Sort by"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(event) => change(setSort)(event.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => change(setOrder)(order === "desc" ? "asc" : "desc")}
          aria-label={
            order === "desc"
              ? "Showing top songs — switch to bottom"
              : "Showing bottom songs — switch to top"
          }
        >
          {order === "desc" ? (
            <ArrowDownWideNarrow size={16} aria-hidden />
          ) : (
            <ArrowUpWideNarrow size={16} aria-hidden />
          )}
          {order === "desc" ? "Top" : "Bottom"}
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-control" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={LineChart}
          title="couldn't load song stats"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="no songs match"
          description={q ? "Try another title." : "Songs appear here once they are added."}
        />
      ) : (
        <>
          {/* Phones: cards */}
          <Stagger className="space-y-2 md:hidden" stagger={0.02} inView={false}>
            {items.map((song, index) => (
              <StaggerItem key={song.id}>
                <Link
                  href={`/admin/performance/${song.id}`}
                  className="block rounded-card border border-line bg-surface p-3 transition hover:border-line-strong"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-semibold text-neon tabular-nums">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </span>
                    <CoverArt
                      src={song.coverUrl}
                      alt=""
                      seed={song.id}
                      className="size-12 rounded-lg"
                      sizes="48px"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{song.title}</span>
                      <span className="block truncate text-xs text-fg-subtle">{song.artist}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums">
                        {formatCount(song.plays)}
                      </span>
                      <span className="text-[0.6875rem] text-fg-subtle">plays</span>
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-[0.6875rem]">
                    {COLUMNS.slice(1, 5).map((column) => (
                      <div key={column.key}>
                        <dt className="text-fg-subtle">{column.label}</dt>
                        <dd className="font-semibold text-fg tabular-nums">
                          {column.format(song[column.key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-card border border-line md:block">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="bg-surface text-xs tracking-wider text-fg-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Song
                  </th>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={cn(
                        "px-3 py-3 text-right font-medium",
                        sort === column.key && "text-neon"
                      )}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((song, index) => {
                  const catalogMeta =
                    song.source === "ai"
                      ? { label: "AI", tone: "warning" }
                      : CATALOG_META[song.catalog];
                  return (
                    <tr
                      key={song.id}
                      className="border-t border-line transition hover:bg-surface-raised"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/admin/performance/${song.id}`}
                          className="flex min-h-11 items-center gap-3"
                        >
                          <span className="w-6 text-right text-xs font-semibold text-neon tabular-nums">
                            {(page - 1) * PAGE_SIZE + index + 1}
                          </span>
                          <CoverArt
                            src={song.coverUrl}
                            alt=""
                            seed={song.id}
                            className="size-10 rounded-md"
                            sizes="40px"
                          />
                          <span className="min-w-0">
                            <span className="block max-w-[16rem] truncate font-medium text-fg hover:text-neon">
                              {song.title}
                            </span>
                            <span className="flex items-center gap-2 text-xs text-fg-subtle">
                              <span className="max-w-[10rem] truncate">{song.artist}</span>
                              {catalogMeta && (
                                <Badge tone={catalogMeta.tone}>{catalogMeta.label}</Badge>
                              )}
                              {song.status !== "published" && (
                                <Badge tone="danger">{song.status.replace("_", " ")}</Badge>
                              )}
                            </span>
                          </span>
                        </Link>
                      </td>
                      {COLUMNS.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "px-3 py-2 text-right font-semibold tabular-nums",
                            sort === column.key ? "text-neon" : "text-fg"
                          )}
                        >
                          {column.format(song[column.key])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} disabled={isFetching} />
    </>
  );
}
