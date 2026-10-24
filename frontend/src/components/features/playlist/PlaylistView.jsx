"use client";

/**
 * Playlist page (/playlist/[id], PRD LIB-2): artwork, name, description,
 * owner, Play / Shuffle; owners can edit (name, description, public /
 * private, cover), share and delete, and reorder / remove songs.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Globe, ListMusic, Lock, Pencil, Play, Share2, Shuffle, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import FadeIn from "@/components/animations/FadeIn";
import PlaylistCover from "@/components/features/playlist/PlaylistCover";
import PlaylistFormSheet from "@/components/features/playlist/PlaylistFormSheet";
import PlaylistTrackList from "@/components/features/playlist/PlaylistTrackList";
import { deletePlaylist, getPlaylist } from "@/services/playlist.service";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useAuthStore } from "@/store/authStore";
import { usePlayerStore } from "@/store/playerStore";
import { QUERY_KEYS } from "@/utils/constants";
import { formatDuration, pluralize } from "@/utils/genericFunctions";

/** Loading placeholder with the page's shape. */
function PlaylistSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading playlist">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        <Skeleton className="size-44 rounded-card" />
        <div className="flex w-full flex-col items-center gap-3 sm:items-start">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mt-10 space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-control" />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {string} props.playlistId
 */
export default function PlaylistView({ playlistId }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isSignedIn = useAuthStore((state) => state.status === "authenticated");
  const playQueue = usePlayerStore((state) => state.playQueue);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const { copy, isCopied } = useCopyToClipboard();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteState, setDeleteState] = useState({ loading: false, error: null });

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.playlist(playlistId),
    queryFn: ({ signal }) => getPlaylist(playlistId, { signal }),
    retry: (count, queryError) => queryError?.status !== 404 && count < 2,
  });

  if (isPending) return <PlaylistSkeleton />;
  if (isError) {
    const isMissing = error?.status === 404;
    return (
      <EmptyState
        icon={ListMusic}
        command={`selfvibe playlist --open ${playlistId}`}
        title={isMissing ? "playlist not found" : "couldn't load this playlist"}
        description={
          isMissing
            ? "It may have been deleted, or it's private."
            : (error?.message ?? "Check your connection and try again.")
        }
        action={
          isMissing ? (
            <Button href={isSignedIn ? "/library" : "/"}>
              {isSignedIn ? "Your Library" : "Home"}
            </Button>
          ) : (
            <Button onClick={() => refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  const { playlist } = data;
  const PrivacyIcon = playlist.isPublic ? Globe : Lock;

  /** Play everything, optionally shuffled. */
  const play = (shuffled) => {
    if (shuffled !== shuffle) toggleShuffle();
    playQueue(playlist.tracks, 0, { source: "playlist" });
  };

  const remove = async () => {
    setDeleteState({ loading: true, error: null });
    try {
      await deletePlaylist(playlist.id);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myPlaylists });
      router.replace("/library");
    } catch (requestError) {
      setDeleteState({ loading: false, error: requestError?.message ?? "Couldn't delete it." });
    }
  };

  return (
    <>
      <FadeIn className="relative isolate mb-8 overflow-hidden rounded-card border border-line bg-surface p-6 sm:p-8">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgb(34_197_94/0.2),transparent_60%)]"
        />
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
          <PlaylistCover
            playlist={playlist}
            priority
            sizes="176px"
            className="size-40 shrink-0 rounded-card shadow-glow-lg sm:size-44"
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center justify-center gap-1.5 text-xs tracking-widest text-neon uppercase sm:justify-start">
              <PrivacyIcon size={14} aria-hidden /> {playlist.isPublic ? "Public" : "Private"}{" "}
              playlist
            </p>
            <h1 className="mt-2 font-display text-[clamp(1.75rem,6vw,3.25rem)] leading-tight font-bold break-words">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="mt-2 text-sm whitespace-pre-line text-fg-muted">
                {playlist.description}
              </p>
            )}
            <p className="mt-2 text-sm text-fg-subtle">
              {playlist.owner?.name} · {pluralize(playlist.trackCount, "song")}
              {playlist.durationSec > 0 && ` · ${formatDuration(playlist.durationSec)}`}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          {playlist.tracks.length > 0 &&
            (isSignedIn ? (
              <>
                <Button size="lg" onClick={() => play(false)}>
                  <Play size={18} fill="currentColor" aria-hidden /> Play
                </Button>
                <Button size="lg" variant="outline" onClick={() => play(true)}>
                  <Shuffle size={18} aria-hidden /> Shuffle
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                href={`/login?next=${encodeURIComponent(`/playlist/${playlist.id}`)}`}
              >
                Log in to listen
              </Button>
            ))}
          {playlist.isPublic && (
            <Button
              variant="ghost"
              onClick={() => copy(`${window.location.origin}/playlist/${playlist.id}`)}
              aria-label="Copy link to this playlist"
            >
              {isCopied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
              {isCopied ? "Link copied" : "Share"}
            </Button>
          )}
          {playlist.isOwner && (
            <>
              <Button variant="ghost" onClick={() => setIsEditing(true)}>
                <Pencil size={16} aria-hidden /> Edit
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsDeleting(true)}
                className="text-danger hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={16} aria-hidden /> Delete
              </Button>
            </>
          )}
        </div>
      </FadeIn>

      {playlist.tracks.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          command="selfvibe playlist --add"
          title="no songs yet"
          description={
            playlist.isOwner
              ? "Use “Add to playlist” in the menu of any song to fill it."
              : "This playlist is empty for now."
          }
          action={playlist.isOwner && <Button href="/search">Find songs</Button>}
        />
      ) : (
        // Re-mount after a server change so the editable order starts fresh
        <PlaylistTrackList key={playlist.updatedAt} playlist={playlist} />
      )}

      {isEditing && (
        <PlaylistFormSheet
          open={isEditing}
          playlist={playlist}
          onClose={() => setIsEditing(false)}
          onSaved={(updated) => {
            setIsEditing(false);
            queryClient.setQueryData(QUERY_KEYS.playlist(playlist.id), { playlist: updated });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myPlaylists });
          }}
        />
      )}
      <ConfirmSheet
        open={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={remove}
        loading={deleteState.loading}
        error={deleteState.error}
        title={`Delete "${playlist.name}"?`}
        description="The playlist is removed for good. The songs themselves stay on SelfVibe."
      />
    </>
  );
}
