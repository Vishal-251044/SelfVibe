"use client";

/**
 * Songs of a playlist. Owners can drag (or use the arrows) to reorder and
 * remove songs; the new order is saved when a drag ends. Visitors see a
 * plain, playable list.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackRow from "@/components/features/music/TrackRow";
import { removeTrackFromPlaylist, reorderPlaylist } from "@/services/playlist.service";
import { useAuthStore } from "@/store/authStore";
import { QUERY_KEYS } from "@/utils/constants";

const ICON_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-fg-subtle transition hover:bg-neon-dim hover:text-neon disabled:opacity-30";

/**
 * One draggable song row (owner view).
 * @param {{ track: Object, position: number, total: number, tracks: Object[], onMove: Function, onRemove: Function, onDragEnd: Function }} props
 */
function EditableRow({ track, position, total, tracks, onMove, onRemove, onDragEnd }) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={track}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className="flex items-center rounded-control bg-ink select-none"
    >
      <button
        type="button"
        onPointerDown={(event) => dragControls.start(event)}
        aria-label={`Drag to reorder ${track.title}`}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-fg-subtle active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <div className="min-w-0 flex-1">
        <TrackRow track={track} tracks={tracks} playable showQueueMenu source="playlist" />
      </div>
      <span className="hidden lg:flex">
        <button
          type="button"
          aria-label={`Move ${track.title} up`}
          disabled={position === 0}
          onClick={() => onMove(position, position - 1)}
          className={ICON_BUTTON}
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          aria-label={`Move ${track.title} down`}
          disabled={position === total - 1}
          onClick={() => onMove(position, position + 1)}
          className={ICON_BUTTON}
        >
          <ArrowDown size={16} />
        </button>
      </span>
      <button
        type="button"
        aria-label={`Remove ${track.title} from playlist`}
        onClick={() => onRemove(track)}
        className={`${ICON_BUTTON} hover:bg-danger/10 hover:text-danger`}
      >
        <X size={16} />
      </button>
    </Reorder.Item>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.playlist - Playlist detail from the API
 */
export default function PlaylistTrackList({ playlist }) {
  const queryClient = useQueryClient();
  const isSignedIn = useAuthStore((state) => state.status === "authenticated");
  const [order, setOrder] = useState(playlist.tracks);
  const [error, setError] = useState(null);

  /** Save the current order (after a drag or an arrow move). */
  const save = async (tracks) => {
    setError(null);
    try {
      const { playlist: updated } = await reorderPlaylist(
        playlist.id,
        tracks.map((track) => track.id)
      );
      queryClient.setQueryData(QUERY_KEYS.playlist(playlist.id), { playlist: updated });
    } catch (requestError) {
      setError(requestError?.message ?? "Couldn't save the new order.");
      setOrder(playlist.tracks);
    }
  };

  const move = (from, to) => {
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
    save(next);
  };

  const remove = async (track) => {
    setError(null);
    setOrder((current) => current.filter((item) => item.id !== track.id));
    try {
      const { playlist: updated } = await removeTrackFromPlaylist(playlist.id, track.id);
      queryClient.setQueryData(QUERY_KEYS.playlist(playlist.id), { playlist: updated });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myPlaylists });
    } catch (requestError) {
      setError(requestError?.message ?? "Couldn't remove the song.");
      setOrder(playlist.tracks);
    }
  };

  if (!playlist.isOwner) {
    return (
      <Stagger className="space-y-1" stagger={0.03} inView={false}>
        {playlist.tracks.map((track, index) => (
          <StaggerItem key={track.id}>
            <TrackRow
              track={track}
              index={index + 1}
              tracks={playlist.tracks}
              playable={isSignedIn}
              showQueueMenu={isSignedIn}
              source="playlist"
            />
          </StaggerItem>
        ))}
      </Stagger>
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-1">
        {order.map((track, position) => (
          <EditableRow
            key={track.id}
            track={track}
            position={position}
            total={order.length}
            tracks={order}
            onMove={move}
            onRemove={remove}
            onDragEnd={() => save(order)}
          />
        ))}
      </Reorder.Group>
    </>
  );
}
