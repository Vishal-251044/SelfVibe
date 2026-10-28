"use client";

/**
 * Song page (/track/[id], roadmap Day 10): the page a shared song link opens.
 * - guests: cover, title, artist, and "Sign up free to listen" / "Log in"
 * - listeners: Play, like, share, comments, add to playlist, and "More like
 *   this" (PRD 10.4.2) below
 * Loading, not-found and error states included.
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Disc3, MessageCircle, Play } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import FadeIn from "@/components/animations/FadeIn";
import CoverArt from "@/components/features/music/CoverArt";
import LikeButton from "@/components/features/music/LikeButton";
import TrackQueueMenu from "@/components/features/music/TrackQueueMenu";
import ShareButton from "@/components/features/share/ShareButton";
import SimilarTracks from "@/components/features/player/SimilarTracks";
import { getTrack } from "@/services/track.service";
import { useAuthStore } from "@/store/authStore";
import { useLibrarySheetsStore } from "@/store/librarySheetsStore";
import { usePlayerStore } from "@/store/playerStore";
import { QUERY_KEYS } from "@/utils/constants";
import { formatDuration } from "@/utils/genericFunctions";

/** Loading placeholder with the page's shape. */
function TrackSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading song">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        <Skeleton className="size-48 rounded-card sm:size-56" />
        <div className="flex w-full flex-col items-center gap-3 sm:items-start">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-12 w-36 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {string} props.trackId
 */
export default function TrackView({ trackId }) {
  const isSignedIn = useAuthStore((state) => state.status === "authenticated");
  const playQueue = usePlayerStore((state) => state.playQueue);
  const currentId = usePlayerStore((state) => state.queue[state.index]?.id ?? null);
  const openComments = useLibrarySheetsStore((state) => state.openComments);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.track(trackId),
    queryFn: ({ signal }) => getTrack(trackId, { signal }),
    retry: (count, queryError) => queryError?.status !== 404 && count < 2,
  });

  if (isPending) return <TrackSkeleton />;
  if (isError) {
    const isMissing = error?.status === 404 || error?.status === 400;
    return (
      <EmptyState
        icon={Disc3}
        title={isMissing ? "song not found" : "couldn't load this song"}
        description={
          isMissing
            ? "It may have been removed by the artist."
            : (error?.message ?? "Check your connection and try again.")
        }
        action={
          isMissing ? (
            <Button href={isSignedIn ? "/home" : "/"}>{isSignedIn ? "Home" : "SelfVibe"}</Button>
          ) : (
            <Button onClick={() => refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  const { track } = data;
  const artistHref = track.artist ? `/artist/${track.artist.slug ?? track.artist.id}` : null;
  const nextPath = encodeURIComponent(`/track/${track.id}`);
  const isPlayingThis = currentId === track.id;

  return (
    <>
      <FadeIn className="relative isolate mb-8 overflow-hidden rounded-card border border-line bg-surface p-6 sm:p-8">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgb(34_197_94/0.2),transparent_60%)]"
        />
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
          <CoverArt
            src={track.coverUrl}
            alt={`${track.title} cover`}
            seed={track.id}
            priority
            sizes="(min-width: 640px) 224px, 192px"
            className="size-48 shrink-0 rounded-card shadow-glow-lg sm:size-56"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs tracking-widest text-neon uppercase">
              {track.catalog === "official" ? "Official" : "Community"} song
            </p>
            <h1 className="mt-2 font-display text-[clamp(1.75rem,6vw,3.25rem)] leading-tight font-bold break-words">
              {track.title}
            </h1>
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-fg-muted sm:justify-start">
              {artistHref ? (
                <Link
                  href={artistHref}
                  className="inline-flex min-h-11 items-center gap-1 font-semibold text-fg hover:text-neon sm:min-h-0"
                >
                  {track.artist.stageName}
                  {track.artist.verified && (
                    <BadgeCheck size={16} className="text-neon" aria-label="Verified artist" />
                  )}
                </Link>
              ) : null}
              {track.durationSec > 0 && <span>· {formatDuration(track.durationSec)}</span>}
              {track.explicit && (
                <span className="rounded border border-line-strong px-1 text-[10px] tracking-wider">
                  E<span className="sr-only">xplicit</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          {isSignedIn ? (
            <>
              <Button size="lg" onClick={() => playQueue([track], 0, { source: "share" })}>
                <Play size={18} fill="currentColor" aria-hidden />
                {isPlayingThis ? "Play again" : "Play"}
              </Button>
              <LikeButton track={track} size={22} />
              <button
                type="button"
                onClick={() => openComments(track)}
                aria-label={`Comments on ${track.title}`}
                className="flex size-11 items-center justify-center rounded-full text-fg-subtle transition hover:bg-neon-dim hover:text-neon"
              >
                <MessageCircle size={20} />
              </button>
              <ShareButton
                type="track"
                id={track.id}
                title={track.title}
                text={`${track.title} by ${track.artist?.stageName ?? "SelfVibe"}`}
              />
              <TrackQueueMenu track={track} />
            </>
          ) : (
            <>
              <Button size="lg" href={`/signup?next=${nextPath}`}>
                <Play size={18} fill="currentColor" aria-hidden /> Sign up free to listen
              </Button>
              <Button size="lg" variant="outline" href={`/login?next=${nextPath}`}>
                Log in
              </Button>
              <ShareButton
                type="track"
                id={track.id}
                title={track.title}
                text={`${track.title} by ${track.artist?.stageName ?? "SelfVibe"}`}
              />
            </>
          )}
        </div>
      </FadeIn>

      {isSignedIn && (
        <FadeIn delay={0.1} className="max-w-2xl">
          <SimilarTracks track={track} />
        </FadeIn>
      )}
    </>
  );
}
