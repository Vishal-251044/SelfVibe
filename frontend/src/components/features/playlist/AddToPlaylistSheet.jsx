"use client";

/**
 * "Add to playlist" (PRD LIB-2): pick one of my playlists for the song, or
 * create a new one with the song already in it. Playlists that already have
 * the song show a check.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import PlaylistCover from "@/components/features/playlist/PlaylistCover";
import { useLibrarySheetsStore } from "@/store/librarySheetsStore";
import { addTracksToPlaylist, createPlaylist, getMyPlaylists } from "@/services/playlist.service";
import { QUERY_KEYS } from "@/utils/constants";
import { pluralize } from "@/utils/genericFunctions";

export default function AddToPlaylistSheet() {
  const queryClient = useQueryClient();
  const track = useLibrarySheetsStore((state) => state.playlistPickerTrack);
  const close = useLibrarySheetsStore((state) => state.closePlaylistPicker);
  // Read once: there is no track until the sheet is opened
  const trackId = track?.id ?? null;
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState({ tone: "error", text: null });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: QUERY_KEYS.myPlaylists,
    queryFn: ({ signal }) => getMyPlaylists({ signal }),
    enabled: Boolean(track),
  });
  const playlists = data?.playlists ?? [];

  const refresh = (playlistId) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myPlaylists });
    if (playlistId) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlist(playlistId) });
  };

  const add = useMutation({
    mutationFn: (playlist) => addTracksToPlaylist(playlist.id, [trackId]),
    onSuccess: (result, playlist) => {
      refresh(playlist.id);
      setMessage({ tone: "success", text: `Added to ${playlist.name}` });
    },
    onError: (error) =>
      setMessage({ tone: "error", text: error?.message ?? "Couldn't add it. Try again." }),
  });

  const createWithTrack = useMutation({
    mutationFn: async (name) => {
      const { playlist } = await createPlaylist({ name });
      await addTracksToPlaylist(playlist.id, [trackId]);
      return playlist;
    },
    onSuccess: (playlist) => {
      refresh(playlist.id);
      setNewName("");
      setIsCreating(false);
      setMessage({ tone: "success", text: `Created ${playlist.name}` });
    },
    onError: (error) =>
      setMessage({ tone: "error", text: error?.message ?? "Couldn't create it." }),
  });

  const onClose = () => {
    close();
    setMessage({ tone: "error", text: null });
    setIsCreating(false);
    setNewName("");
  };

  return (
    <Sheet
      open={Boolean(track)}
      onClose={onClose}
      title="Add to playlist"
      description={track ? track.title : undefined}
    >
      <div className="space-y-4">
        <FormAlert message={message.text} tone={message.tone} />

        {isCreating ? (
          <div className="flex items-end gap-2">
            <TextField
              label="New playlist name"
              value={newName}
              maxLength={100}
              className="flex-1"
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) =>
                event.key === "Enter" && newName.trim() && createWithTrack.mutate(newName.trim())
              }
            />
            <Button
              onClick={() => createWithTrack.mutate(newName.trim())}
              disabled={!newName.trim()}
              loading={createWithTrack.isPending}
            >
              Create
            </Button>
          </div>
        ) : (
          <Button variant="outline" fullWidth onClick={() => setIsCreating(true)}>
            <Plus size={16} aria-hidden /> New playlist
          </Button>
        )}

        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-control" />
            ))}
          </div>
        ) : isError ? (
          <FormAlert message="Couldn't load your playlists." />
        ) : playlists.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-muted">
            You don&apos;t have any playlists yet. Create one above.
          </p>
        ) : (
          <ul className="space-y-1" aria-label="Your playlists">
            {playlists.map((playlist) => {
              const hasTrack = Boolean(trackId) && playlist.trackIds.includes(trackId);
              const isAdding = add.isPending && add.variables?.id === playlist.id;
              return (
                <li key={playlist.id}>
                  <button
                    type="button"
                    disabled={hasTrack || add.isPending}
                    onClick={() => add.mutate(playlist)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-control px-2 text-left transition hover:bg-neon-dim disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <PlaylistCover
                      playlist={playlist}
                      className="size-12 shrink-0 rounded-md"
                      sizes="48px"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">{playlist.name}</span>
                      <span className="block text-xs text-fg-subtle">
                        {pluralize(playlist.trackCount, "song")}
                      </span>
                    </span>
                    {isAdding ? (
                      <Loader2 size={18} className="animate-spin text-neon" aria-hidden />
                    ) : hasTrack ? (
                      <span className="flex items-center gap-1 text-xs text-neon">
                        <Check size={16} aria-hidden /> Added
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {isError && (
          <Button variant="ghost" onClick={() => refetch()}>
            Try again
          </Button>
        )}
      </div>
    </Sheet>
  );
}
