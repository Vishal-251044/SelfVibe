/**
 * Public shapes of playlists. Storage keys never leave the API.
 */
import { toPublicTrack } from "./track.serializer.js";

/**
 * Playlist card (Library grid, "Add to playlist" list).
 * @param {Object} playlist
 * @param {string[]} [covers] - Uploaded cover or up to four song covers (mosaic)
 * @returns {Object}
 */
export function toPlaylistSummary(playlist, covers = []) {
  return {
    id: String(playlist._id),
    name: playlist.name,
    description: playlist.description ?? "",
    isPublic: Boolean(playlist.isPublic),
    coverUrl: playlist.coverUrl ?? null,
    covers,
    trackCount: playlist.tracks?.length ?? 0,
    trackIds: (playlist.tracks ?? []).map((entry) => String(entry.trackId)),
    updatedAt: playlist.updatedAt,
  };
}

/**
 * Playlist page: details, owner and songs in order.
 * @param {{ playlist: Object, tracks: Array<{ addedAt: Date, track: Object }>, covers: string[], isOwner: boolean }} data
 * @returns {Object}
 */
export function toPlaylistDetail({ playlist, tracks, covers, isOwner }) {
  const owner = playlist.ownerId;
  return {
    ...toPlaylistSummary(playlist, covers),
    trackCount: tracks.length,
    durationSec: tracks.reduce((total, entry) => total + (entry.track.audio?.durationSec ?? 0), 0),
    owner: owner?._id
      ? { id: String(owner._id), name: owner.name, avatar: owner.avatar ?? null }
      : null,
    isOwner,
    tracks: tracks.map((entry) => ({ addedAt: entry.addedAt, ...toPublicTrack(entry.track) })),
  };
}
