"use client";

/**
 * Creator studio home (/creator): artist card, quick stats, and "My tracks"
 * with status, preview and actions. Refreshes automatically while any track
 * is still processing.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Headphones, Loader2, Music2, Radio, Upload } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import PageHeader from "@/components/ui/PageHeader";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackRow from "@/components/features/music/TrackRow";
import TrackStatusBadge from "@/components/features/music/TrackStatusBadge";
import CreatorTrackActions from "@/components/features/creator/CreatorTrackActions";
import UploadAllowance from "@/components/features/creator/UploadAllowance";
import { listMyTracks } from "@/services/track.service";
import { QUERY_KEYS } from "@/utils/constants";
import { PROCESSING_POLL_MS } from "@/utils/musicConstants";

const PAGE_SIZE = 20;

/**
 * @param {Object} props
 * @param {Object} props.artist - My artist profile
 */
export default function CreatorDashboard({ artist }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEYS.myTracks(page),
    queryFn: ({ signal }) => listMyTracks({ page, limit: PAGE_SIZE }, { signal }),
    placeholderData: (previous) => previous,
    // Keep polling while something is processing so statuses update by themselves
    refetchInterval: (query) =>
      query.state.data?.tracks?.some((track) =>
        ["queued", "running"].includes(track.processing?.state)
      )
        ? PROCESSING_POLL_MS
        : false,
  });

  const tracks = data?.tracks ?? [];
  const processingCount = tracks.filter((t) =>
    ["queued", "running"].includes(t.processing?.state)
  ).length;

  // Storage used is only known once processing finishes: refresh the allowance then
  useEffect(() => {
    if (processingCount === 0)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myUploadUsage });
  }, [processingCount, queryClient]);
  const stats = [
    { icon: Music2, label: "Tracks", value: data?.meta?.total ?? "–" },
    { icon: Radio, label: "Live", value: tracks.filter((t) => t.status === "published").length },
    {
      icon: Loader2,
      label: "Processing",
      value: processingCount,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="selfvibe studio --creator"
        title="Creator studio"
        subtitle="Upload tracks, follow their processing and manage what's live."
        actions={
          <Button href="/creator/upload" size="lg">
            <Upload size={18} aria-hidden /> Upload a song
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <section className="flex items-center gap-4 rounded-card border border-line bg-surface p-5">
          <Avatar name={artist.stageName} src={artist.avatar} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs tracking-widest text-neon uppercase">Artist</p>
            <p className="truncate font-display text-xl font-bold">{artist.stageName}</p>
            <Button
              href={`/artist/${artist.slug ?? artist.id}`}
              variant="ghost"
              className="-ml-3 px-3"
            >
              View public page <ExternalLink size={14} aria-hidden />
            </Button>
          </div>
        </section>
        <section className="grid grid-cols-3 gap-3" aria-label="Stats">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-card border border-line bg-surface p-4">
              <Icon size={18} className="text-neon" aria-hidden />
              <p className="mt-3 font-display text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-fg-muted">{label}</p>
            </div>
          ))}
        </section>
      </div>

      <UploadAllowance className="mt-4" />

      <section className="mt-10" aria-labelledby="my-tracks-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="my-tracks-heading" className="font-display text-xl font-bold">
            My tracks
          </h2>
          {isFetching && !isPending && (
            <Loader2 size={16} className="animate-spin text-fg-subtle" aria-label="Refreshing" />
          )}
        </div>

        {isPending ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-control" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={Headphones}
            command="selfvibe tracks --mine"
            title="couldn't load your tracks"
            description={error?.message}
            action={<Button onClick={() => refetch()}>Try again</Button>}
          />
        ) : tracks.length === 0 ? (
          <EmptyState
            icon={Upload}
            command="selfvibe upload"
            title="no tracks yet"
            description="Upload your first track — we'll create the streaming versions and publish it when it's ready."
            action={<Button href="/creator/upload">Upload a song</Button>}
          />
        ) : (
          <>
            <Stagger className="space-y-1" stagger={0.04} inView={false}>
              {tracks.map((track) => (
                <StaggerItem key={track.id}>
                  <TrackRow
                    track={track}
                    showArtist={false}
                    tracks={tracks.filter((item) => item.bitrates?.length > 0)}
                    playable
                    source="studio"
                    canPlay={track.bitrates?.length > 0}
                    status={<TrackStatusBadge track={track} />}
                    actions={<CreatorTrackActions track={track} />}
                  />
                  {track.processing?.state === "failed" && track.processing.error && (
                    <p role="alert" className="mb-2 ml-[4.5rem] text-xs text-danger sm:ml-24">
                      {track.processing.error}
                    </p>
                  )}
                </StaggerItem>
              ))}
            </Stagger>
            <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />
          </>
        )}
      </section>
    </>
  );
}
