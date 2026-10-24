/**
 * Which library sheet is open: "Add to playlist" or a song's comments.
 * Any track row, the player or Now Playing can open them; the sheets
 * themselves are mounted once (LibrarySheets in the app shell).
 */
import { create } from "zustand";

export const useLibrarySheetsStore = create((set) => ({
  playlistPickerTrack: null, // track being added to a playlist
  commentsTrack: null, // track whose comments are open

  /** @param {Object} track */
  openPlaylistPicker: (track) => set({ playlistPickerTrack: track }),
  closePlaylistPicker: () => set({ playlistPickerTrack: null }),
  /** @param {Object} track */
  openComments: (track) => set({ commentsTrack: track }),
  closeComments: () => set({ commentsTrack: null }),
}));
