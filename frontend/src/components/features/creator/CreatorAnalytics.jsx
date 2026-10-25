"use client";

/**
 * Creator analytics (PRD CRT-7, PRF-4, roadmap Day 9): plays, unique
 * listeners, likes, saves, comments and completion for your own songs, plays
 * over time, where plays come from, and your top tracks — for 7 / 30 / 90
 * days or all time. Numbers update every hour. Listener identities are never shown.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Heart,
  ListPlus,
  MessageCircle,
  PlayCircle,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import CoverArt from "@/components/features/music/CoverArt";
import StatCard from "@/components/features/admin/insights/StatCard";
import RangeTabs from "@/components/features/admin/insights/RangeTabs";
import TrendChart from "@/components/features/admin/insights/TrendChart";
import BarBreakdown from "@/components/features/admin/insights/BarBreakdown";
import { getCreatorAnalytics } from "@/services/creator.service";
import { QUERY_KEYS } from "@/utils/constants";
import { formatCount, formatRate } from "@/utils/genericFunctions";

export default function CreatorAnalytics() {
  const [range, setRange] = useState(30);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.creatorAnalytics(range),
    queryFn: ({ signal }) => getCreatorAnalytics(range, { signal }),
    placeholderData: (previous) => previous,
  });

  return (
    <section className="mt-10" aria-labelledby="analytics-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-neon">$ selfvibe studio --analytics</p>
          <h2 id="analytics-heading" className="font-display text-xl font-bold sm:text-2xl">
            Your analytics
          </h2>
        </div>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      {isPending ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={BarChart3}
          command="selfvibe studio --analytics"
          title="couldn't load your stats"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : data.songCount === 0 ? (
        <EmptyState
          icon={BarChart3}
          command="selfvibe studio --analytics"
          title="no stats yet"
          description="Publish a song and your plays, listeners and likes show up here."
          action={<Button href="/creator/upload">Upload a song</Button>}
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Plays" icon={PlayCircle} value={formatCount(data.totals.plays)} />
            <StatCard
              label="Listeners"
              icon={Users}
              value={formatCount(data.totals.listeners)}
              hint="Different people"
            />
            <StatCard
              label="Completion"
              icon={Trophy}
              value={formatRate(data.totals.completionRate)}
              hint="Heard to the end"
            />
            <StatCard
              label="Followers"
              icon={UserPlus}
              value={formatCount(data.followers)}
              hint="All time"
            />
            <StatCard label="Likes" icon={Heart} value={formatCount(data.totals.likes)} />
            <StatCard
              label="Saves"
              icon={ListPlus}
              value={formatCount(data.totals.saves)}
              hint="Added to playlists"
            />
            <StatCard
              label="Comments"
              icon={MessageCircle}
              value={formatCount(data.totals.comments)}
            />
            <StatCard
              label="Skip rate"
              value={formatRate(data.totals.skipRate)}
              hint="Skipped in 30 s"
              tone={data.totals.skipRate > 0.4 ? "warning" : "default"}
            />
          </div>
          <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
              <TrendChart series={data.series} valueKey="plays" label="Plays per day" />
            </section>
            <BarBreakdown
              title="Where plays come from"
              data={data.sources}
              emptyText="No plays in this period"
            />
          </div>
          <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-semibold text-neon-soft">Top tracks</h3>
            <ol className="space-y-1">
              {data.topTracks.map((track, index) => (
                <li key={track.id} className="flex min-h-14 items-center gap-3 rounded-lg px-2">
                  <span className="w-5 font-mono text-xs text-neon">{index + 1}</span>
                  <CoverArt
                    src={track.coverUrl}
                    alt=""
                    seed={track.id}
                    className="size-10 rounded-md"
                    sizes="40px"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{track.title}</span>
                    <span className="block truncate text-xs text-fg-subtle">
                      {formatCount(track.likes)} likes · {formatCount(track.saves)} saves ·{" "}
                      {formatRate(track.completionRate)} finish
                    </span>
                  </span>
                  <span className="text-right font-mono text-sm">
                    {formatCount(track.plays)}
                    <span className="block text-[0.6875rem] text-fg-subtle">plays</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </section>
  );
}
