"use client";

/**
 * Your Library (/library, PRD LIB-1–4): Liked Songs, playlists (with "New
 * playlist"), Recently played (history) and the artists you follow.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Heart, History, Plus, UserCheck } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackRow from "@/components/features/music/TrackRow";
import PlaylistCard from "@/components/features/playlist/PlaylistCard";
import PlaylistFormSheet from "@/components/features/playlist/PlaylistFormSheet";
import { getMyPlaylists } from "@/services/playlist.service";
import { getFollowedArtists, getLikedTrackIds } from "@/services/library.service";
import { getHistory } from "@/services/listening.service";
import { QUERY_KEYS } from "@/utils/constants";
import { hoverLift, tapPress } from "@/utils/animations";
import { pluralize } from "@/utils/genericFunctions";

const RECENT_LIMIT = 20;

/**
 * Section heading with an optional action on the right.
 * @param {{ id: string, title: string, action?: React.ReactNode }} props
 */
function SectionHeading({ id, title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 id={id} className="font-display text-xl font-bold">
        {title}
      </h2>
      {action}
    </div>
  );
}

export default function LibraryView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const playlists = useQuery({
    queryKey: QUERY_KEYS.myPlaylists,
    queryFn: ({ signal }) => getMyPlaylists({ signal }),
  });
  const likedIds = useQuery({
    queryKey: QUERY_KEYS.likedIds,
    queryFn: ({ signal }) => getLikedTrackIds({ signal }),
  });
  const history = useQuery({
    queryKey: QUERY_KEYS.history,
    queryFn: ({ signal }) => getHistory({ limit: 100 }, { signal }),
  });
  const follows = useQuery({
    queryKey: QUERY_KEYS.follows,
    queryFn: ({ signal }) => getFollowedArtists({ limit: 50 }, { signal }),
  });

  // Recently played: each song once, most recent first
  const recentTracks = [];
  const seen = new Set();
  for (const item of history.data?.items ?? []) {
    if (seen.has(item.track.id)) continue;
    seen.add(item.track.id);
    recentTracks.push(item.track);
    if (recentTracks.length === RECENT_LIMIT) break;
  }
  const likedCount = likedIds.data?.trackIds?.length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="selfvibe library --list"
        title="Your Library"
        subtitle="Everything you like, save and follow, in one place."
      />

      {/* Playlists + Liked Songs */}
      <section aria-labelledby="playlists-heading" className="mb-10">
        <SectionHeading
          id="playlists-heading"
          title="Playlists"
          action={
            <Button variant="outline" onClick={() => setIsCreating(true)}>
              <Plus size={16} aria-hidden /> New playlist
            </Button>
          }
        />
        <Stagger
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          inView={false}
          stagger={0.04}
        >
          <StaggerItem className="h-full">
            <motion.div whileHover={hoverLift} whileTap={tapPress} className="h-full">
              <Link
                href="/library/liked"
                className="flex h-full min-h-48 flex-col justify-end rounded-card border border-line-strong bg-[radial-gradient(circle_at_30%_20%,rgb(34_197_94/0.45),transparent_60%),linear-gradient(160deg,#0b120d,#000)] p-4 shadow-glow-sm transition hover:shadow-glow"
              >
                <Heart size={28} className="mb-auto text-neon" fill="currentColor" aria-hidden />
                <span className="font-display text-lg font-bold">Liked Songs</span>
                <span className="text-xs text-fg-muted">
                  {likedIds.isPending ? "…" : pluralize(likedCount, "song")}
                </span>
              </Link>
            </motion.div>
          </StaggerItem>
          {playlists.isPending
            ? Array.from({ length: 4 }, (_, index) => (
                <StaggerItem key={index}>
                  <Skeleton className="aspect-[4/5] rounded-card" />
                </StaggerItem>
              ))
            : (playlists.data?.playlists ?? []).map((playlist) => (
                <StaggerItem key={playlist.id} className="h-full">
                  <PlaylistCard playlist={playlist} />
                </StaggerItem>
              ))}
        </Stagger>
        {playlists.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            Couldn&apos;t load your playlists.{" "}
            <button
              type="button"
              onClick={() => playlists.refetch()}
              className="min-h-11 underline"
            >
              Try again
            </button>
          </p>
        )}
        {playlists.isSuccess && playlists.data.playlists.length === 0 && (
          <p className="mt-4 text-sm text-fg-muted">
            No playlists yet. Create one, or use &ldquo;Add to playlist&rdquo; on any song.
          </p>
        )}
      </section>

      {/* Recently played (LIB-3) */}
      <section aria-labelledby="recent-heading" className="mb-10">
        <SectionHeading id="recent-heading" title="Recently played" />
        {history.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-control" />
            ))}
          </div>
        ) : recentTracks.length === 0 ? (
          <EmptyState
            icon={History}
            command="selfvibe history --recent"
            title="nothing played yet"
            description="Songs you listen to show up here."
            action={<Button href="/search">Find music</Button>}
          />
        ) : (
          <Stagger className="space-y-1" stagger={0.03} inView={false}>
            {recentTracks.map((track, index) => (
              <StaggerItem key={track.id}>
                <TrackRow
                  track={track}
                  index={index + 1}
                  tracks={recentTracks}
                  playable
                  showQueueMenu
                  source="history"
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      {/* Following (LIB-4) */}
      <section aria-labelledby="following-heading">
        <SectionHeading id="following-heading" title="Following" />
        {follows.isPending ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="size-24 shrink-0 rounded-full" />
            ))}
          </div>
        ) : (follows.data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={UserCheck}
            command="selfvibe follow --list"
            title="not following anyone yet"
            description="Follow artists from their page to see them here."
          />
        ) : (
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {follows.data.items.map(({ artist }) => (
              <Link
                key={artist.id}
                href={`/artist/${artist.slug ?? artist.id}`}
                className="group flex w-24 shrink-0 snap-start flex-col items-center gap-2 text-center sm:w-28"
              >
                <Avatar
                  name={artist.stageName}
                  src={artist.avatar}
                  size="xl"
                  className="size-24 transition group-hover:shadow-glow sm:size-28"
                />
                <span className="w-full truncate text-sm group-hover:text-neon">
                  {artist.stageName}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {isCreating && (
        <PlaylistFormSheet
          open={isCreating}
          onClose={() => setIsCreating(false)}
          onSaved={(playlist) => {
            setIsCreating(false);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myPlaylists });
            router.push(`/playlist/${playlist.id}`);
          }}
        />
      )}
    </>
  );
}
