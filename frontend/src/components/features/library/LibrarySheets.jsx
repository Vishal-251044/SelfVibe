"use client";

/**
 * The "Add to playlist" and comments sheets, mounted once in the app shell
 * and opened from anywhere through useLibrarySheetsStore.
 */
import AddToPlaylistSheet from "@/components/features/playlist/AddToPlaylistSheet";
import CommentsSheet from "@/components/features/comments/CommentsSheet";

export default function LibrarySheets() {
  return (
    <>
      <AddToPlaylistSheet />
      <CommentsSheet />
    </>
  );
}
