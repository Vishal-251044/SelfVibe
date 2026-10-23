"use client";

/**
 * Admin Console → one track (/admin/music/[id]): preview with waveform,
 * status and processing info, release controls, edit form, reprocess and
 * delete. Polls while the track is processing.
 */
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Music4, Scale } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import FadeIn from "@/components/animations/FadeIn";
import CoverArt from "@/components/features/music/CoverArt";
import PlayButton from "@/components/features/music/PlayButton";
import Waveform from "@/components/features/music/Waveform";
import TrackStatusBadge from "@/components/features/music/TrackStatusBadge";
import TrackReleasePanel from "@/components/features/admin/music/TrackReleasePanel";
import TrackMaintenancePanel from "@/components/features/admin/music/TrackMaintenancePanel";
import AdminTrackEditForm from "@/components/features/admin/music/AdminTrackEditForm";
import { getAdminPreviewStream, getAdminTrack } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";
import { formatDuration } from "@/utils/genericFunctions";
import { PROCESSING_POLL_MS } from "@/utils/musicConstants";

/**
 * @param {Object} props
 * @param {string} props.trackId
 */
export default function AdminTrackDetail({ trackId }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminTrack(trackId),
    queryFn: ({ signal }) => getAdminTrack(trackId, { signal }),
    retry: (count, queryError) => queryError?.status !== 404 && count < 2,
    refetchInterval: (query) =>
      ["queued", "running"].includes(query.state.data?.track?.processing?.state)
        ? PROCESSING_POLL_MS
        : false,
  });

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading track">
        <Skeleton className="h-44 w-full rounded-card" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        icon={Music4}
        command={`selfvibe tracks --open ${trackId}`}
        title={error?.status === 404 ? "track not found" : "couldn't load this track"}
        description={error?.message}
        action={
          error?.status === 404 ? (
            <Button href="/admin/music">Back to music</Button>
          ) : (
            <Button onClick={() => refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  const { track } = data;
  const isReady = track.bitrates?.length > 0;

  return (
    <>
      <Button href="/admin/music" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Music
      </Button>

      <FadeIn className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <CoverArt
            src={track.coverUrl}
            alt={`${track.title} cover`}
            className="size-32 rounded-xl shadow-glow sm:size-36"
            sizes="144px"
            priority
          />
          <div className="min-w-0 flex-1">
            <TrackStatusBadge track={track} />
            <h1 className="mt-2 font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-tight font-bold break-words">
              {track.title}
            </h1>
            <p className="text-fg-muted">{track.artist?.stageName}</p>
            <p className="mt-1 text-xs text-fg-subtle">
              {isReady
                ? `${formatDuration(track.durationSec)} · ${track.bitrates.join(" / ")} kbps · added via ${track.addedVia}`
                : `Processing attempt ${track.processing.attempts || 1}`}
            </p>
          </div>
          <PlayButton
            trackId={track.id}
            title={track.title}
            size="lg"
            disabled={!isReady}
            loadUrl={() => getAdminPreviewStream(track.id, { quality: "high" })}
          />
        </div>
        {track.waveform?.length > 0 && (
          <Waveform trackId={track.id} peaks={track.waveform} className="mt-6 h-14" />
        )}
        {track.processing?.state === "failed" && (
          <p
            role="alert"
            className="mt-4 rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {track.processing.error ?? "Processing failed."} Replace the file below and reprocess.
          </p>
        )}
        {track.license && (
          <p className="mt-4 flex items-start gap-2 text-xs text-fg-subtle">
            <Scale size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {track.license.attribution ?? track.license.name}
              {track.license.url && (
                <>
                  {" · "}
                  <a
                    href={track.license.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-neon"
                  >
                    licence
                  </a>
                </>
              )}
            </span>
          </p>
        )}
      </FadeIn>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <AdminTrackEditForm key={track.id} track={track} />
        <div className="space-y-6">
          <TrackReleasePanel track={track} />
          <TrackMaintenancePanel track={track} canDelete />
        </div>
      </div>
    </>
  );
}
