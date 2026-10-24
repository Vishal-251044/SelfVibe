/**
 * Playlist page (/playlist/[id]): yours to edit, or someone's public playlist
 * (guests can open shared links — see PUBLIC_APP_PATHS).
 */
import PlaylistView from "@/components/features/playlist/PlaylistView";

export const metadata = { title: "Playlist" };

export default async function PlaylistPage({ params }) {
  const { id } = await params;
  return <PlaylistView playlistId={id} />;
}
