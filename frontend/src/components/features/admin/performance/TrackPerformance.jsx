"use client";

/**
 * Console → one song's performance (PRD 10.15.2, roadmap Day 9 "DONE WHEN"):
 * plays, listeners, average listened %, completion, skips, likes, saves and
 * comments for a range, the day-by-day chart, where plays come from and on
 * which devices, the latest comments (with moderation actions), reports, and
 * a CSV export.
 */
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Flag,
  Heart,
  LineChart,
  ListPlus,
  MessageCircle,
  PlayCircle,
  SkipForward,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import CoverArt from "@/components/features/music/CoverArt";
import PlayButton from "@/components/features/music/PlayButton";
import FadeIn from "@/components/animations/FadeIn";
import StatCard from "@/components/features/admin/insights/StatCard";
import RangeTabs from "@/components/features/admin/insights/RangeTabs";
import TrendChart from "@/components/features/admin/insights/TrendChart";
import BarBreakdown from "@/components/features/admin/insights/BarBreakdown";
import AdminCommentRow from "@/components/features/admin/comments/AdminCommentRow";
import { exportTrackCsv, getTrackPerformance } from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import { QUERY_KEYS } from "@/utils/constants";
import { CATALOG_META, TRACK_STATUS_META } from "@/utils/musicConstants";
import {
  formatCount,
  formatDuration,
  formatRate,
  formatRelativeTime,
} from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string} props.trackId
 */
export default function TrackPerformance({ trackId }) {
  const [range, setRange] = useState(30);
  const [isExporting, setIsExporting] = useState(false);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminTrackPerformance(trackId, range),
    queryFn: ({ signal }) => getTrackPerformance(trackId, range, { signal }),
    placeholderData: (previous) => previous,
    retry: (count, queryError) => queryError?.status !== 404 && count < 2,
  });

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      await exportTrackCsv(trackId, range);
    } catch (exportError) {
      showToast({
        message: exportError?.message ?? "export failed",
        tone: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading song performance">
        <Skeleton className="h-32 rounded-card" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-card" />
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        icon={LineChart}
        title={error?.status === 404 ? "song not found" : "couldn't load this song's stats"}
        description={error?.message}
        action={
          error?.status === 404 ? (
            <Button href="/admin/performance">All songs</Button>
          ) : (
            <Button onClick={() => refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  const { track, totals, allTime, series, sources, devices, comments, reports } = data;
  const catalog =
    track.source === "ai" ? { label: "AI", tone: "warning" } : CATALOG_META[track.catalog];
  const status = TRACK_STATUS_META[track.status];
  const openReports = reports.filter((report) => report.status === "open").length;

  return (
    <>
      <Button href="/admin/performance" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Song performance
      </Button>

      <FadeIn className="mb-6 flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative shrink-0 self-start">
          <CoverArt
            src={track.coverUrl}
            alt={`${track.title} cover`}
            seed={track.id}
            className="size-24 rounded-card sm:size-28"
            sizes="112px"
          />
          {track.status === "published" && (
            <PlayButton
              track={track}
              scope="staff"
              size="sm"
              className="absolute right-1 bottom-1"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-tight font-bold">
            {track.title}
          </h1>
          <p className="truncate text-sm text-fg-muted">{track.artist?.stageName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
            {catalog && <Badge tone={catalog.tone}>{catalog.label}</Badge>}
            {status && <Badge tone={status.tone}>{status.label}</Badge>}
            <span>{formatDuration(track.durationSec)}</span>
            {track.publishedAt && <span>· released {formatRelativeTime(track.publishedAt)}</span>}
            <span>· {formatCount(allTime.plays)} plays all time</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCsv} loading={isExporting}>
            <Download size={16} aria-hidden /> CSV
          </Button>
          <Button href={`/admin/music/${track.id}`} variant="ghost">
            Edit song
          </Button>
        </div>
      </FadeIn>

      <RangeTabs value={range} onChange={setRange} className="mb-5" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Plays" icon={PlayCircle} value={formatCount(totals.plays)} />
        <StatCard
          label="Listeners"
          icon={Users}
          value={formatCount(totals.listeners)}
          hint="Different people"
        />
        <StatCard
          label="Avg listened"
          icon={Timer}
          value={totals.avgListenPct === null ? "—" : `${Math.round(totals.avgListenPct)}%`}
          hint="Of the song, per play"
        />
        <StatCard
          label="Completion"
          icon={Trophy}
          value={formatRate(totals.completionRate)}
          hint={`${formatCount(totals.completes)} heard to the end`}
        />
        <StatCard
          label="Skip rate"
          icon={SkipForward}
          tone={totals.skipRate > 0.4 ? "warning" : "default"}
          value={formatRate(totals.skipRate)}
          hint="Skipped in the first 30 s"
        />
        <StatCard
          label="Likes"
          icon={Heart}
          value={formatCount(totals.likes)}
          hint={`${formatCount(allTime.likes)} all time`}
        />
        <StatCard
          label="Saves"
          icon={ListPlus}
          value={formatCount(totals.saves)}
          hint={`In ${formatCount(allTime.saves)} playlists`}
        />
        <StatCard
          label="Comments"
          icon={MessageCircle}
          value={formatCount(totals.comments)}
          hint={openReports ? `${openReports} open report(s)` : undefined}
          tone={openReports ? "warning" : "default"}
        />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
          <TrendChart series={series} valueKey="plays" label="Plays per day" />
        </section>
        <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
          <TrendChart series={series} valueKey="listeners" label="Listeners per day" />
        </section>
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <BarBreakdown title="Where plays come from" data={sources} />
        <BarBreakdown title="Devices" data={devices} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              Comments{" "}
              <span className="text-sm font-normal text-fg-subtle">({comments.total})</span>
            </h2>
            <Link
              href={`/admin/comments?trackId=${track.id}`}
              className="inline-flex min-h-11 items-center text-xs text-fg-muted hover:text-neon"
            >
              See all
            </Link>
          </div>
          {comments.items.length === 0 ? (
            <p className="rounded-card border border-dashed border-line p-4 text-sm text-fg-subtle">
              No comments yet
            </p>
          ) : (
            <div className="space-y-2">
              {comments.items.map((comment) => (
                <AdminCommentRow key={comment.id} comment={comment} showTrack={false} />
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Reports</h2>
          {reports.length === 0 ? (
            <p className="rounded-card border border-dashed border-line p-4 text-sm text-fg-subtle">
              No reports
            </p>
          ) : (
            <ul className="space-y-2">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="rounded-card border border-line bg-surface p-3 text-sm"
                >
                  <p className="flex items-center gap-2">
                    <Flag size={14} className="text-warning" aria-hidden />
                    <span className="capitalize">{report.reason}</span>
                    <Badge tone={report.status === "open" ? "warning" : "muted"}>
                      {report.status}
                    </Badge>
                  </p>
                  {report.details && <p className="mt-1 text-xs text-fg-muted">{report.details}</p>}
                  <p className="mt-1 text-xs text-fg-subtle">
                    {report.reporter ?? "Someone"} · {formatRelativeTime(report.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {openReports > 0 && (
            <Button href="/admin/moderation" variant="outline" fullWidth className="mt-3">
              Open moderation queue
            </Button>
          )}
        </section>
      </div>
    </>
  );
}
