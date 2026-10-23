"use client";

/**
 * Choose which of the artist's tracks are on an album and in what order
 * (PRD F37). Arrow buttons move tracks (keyboard and touch friendly), then save.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus, Plus, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import Skeleton from "@/components/ui/Skeleton";
import CoverArt from "@/components/features/music/CoverArt";
import { listAdminTracks, setAdminAlbumTracks } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";
import { formatDuration } from "@/utils/genericFunctions";

const ARTIST_TRACK_LIMIT = 100;

/**
 * Round icon button used for move / add / remove.
 * @param {{ label: string, onClick: () => void, disabled?: boolean, children: React.ReactNode }} props
 */
function IconAction({ label, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition hover:bg-neon-dim hover:text-neon disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.album
 * @param {string} props.artistId
 */
export default function AlbumTracksEditor({ album, artistId }) {
  const queryClient = useQueryClient();
  const [order, setOrder] = useState(album.trackIds);
  const [message, setMessage] = useState({ tone: "error", text: null });
  const [isSaving, setIsSaving] = useState(false);

  const artistTracksQuery = { artistId, limit: ARTIST_TRACK_LIMIT };
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEYS.adminTracks(artistTracksQuery),
    queryFn: ({ signal }) => listAdminTracks(artistTracksQuery, { signal }),
  });
  const allTracks = data?.tracks ?? [];
  const tracksById = new Map(allTracks.map((track) => [track.id, track]));
  const inAlbum = order.map((id) => tracksById.get(id)).filter(Boolean);
  const available = allTracks.filter((track) => !order.includes(track.id));

  const move = (index, delta) => {
    setOrder((current) => {
      const next = [...current];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  };

  const save = async () => {
    setIsSaving(true);
    setMessage({ tone: "error", text: null });
    try {
      await setAdminAlbumTracks(album.id, order);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminArtist(artistId) });
      setMessage({ tone: "success", text: "Track order saved." });
    } catch (error) {
      setMessage({ tone: "error", text: error?.message ?? "Couldn't save. Try again." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-control" />
        ))}
      </div>
    );
  }

  const isDirty = JSON.stringify(order) !== JSON.stringify(album.trackIds);
  const rowClass = "flex min-h-14 items-center gap-2 rounded-control px-2";

  return (
    <div className="space-y-4">
      <ol className="space-y-1" aria-label={`${album.title} tracks`}>
        {inAlbum.length === 0 && (
          <li className="px-2 text-sm text-fg-muted">No tracks on this album yet.</li>
        )}
        {inAlbum.map((track, index) => (
          <li key={track.id} className={`${rowClass} bg-black`}>
            <span className="w-5 text-right text-xs text-fg-subtle tabular-nums">{index + 1}</span>
            <CoverArt
              src={track.coverUrl}
              alt={`${track.title} cover`}
              className="size-10 rounded-md"
              sizes="40px"
            />
            <span className="min-w-0 flex-1 truncate text-sm">{track.title}</span>
            <span className="hidden text-xs text-fg-subtle sm:block">
              {formatDuration(track.durationSec)}
            </span>
            <IconAction
              label={`Move ${track.title} up`}
              onClick={() => move(index, -1)}
              disabled={index === 0}
            >
              <ArrowUp size={16} />
            </IconAction>
            <IconAction
              label={`Move ${track.title} down`}
              onClick={() => move(index, 1)}
              disabled={index === inAlbum.length - 1}
            >
              <ArrowDown size={16} />
            </IconAction>
            <IconAction
              label={`Remove ${track.title} from album`}
              onClick={() => setOrder((current) => current.filter((id) => id !== track.id))}
            >
              <Minus size={16} />
            </IconAction>
          </li>
        ))}
      </ol>

      {available.length > 0 && (
        <div>
          <p className="mb-1 text-xs tracking-widest text-fg-subtle uppercase">
            Other tracks by this artist
          </p>
          <ul className="max-h-60 space-y-1 overflow-y-auto">
            {available.map((track) => (
              <li key={track.id} className={rowClass}>
                <CoverArt
                  src={track.coverUrl}
                  alt={`${track.title} cover`}
                  className="size-10 rounded-md"
                  sizes="40px"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">{track.title}</span>
                <IconAction
                  label={`Add ${track.title} to album`}
                  onClick={() => setOrder((current) => [...current, track.id])}
                >
                  <Plus size={16} />
                </IconAction>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormAlert message={message.text} tone={message.tone} />
      <Button fullWidth onClick={save} loading={isSaving} disabled={!isDirty}>
        <Save size={16} aria-hidden /> Save track order
      </Button>
    </div>
  );
}
