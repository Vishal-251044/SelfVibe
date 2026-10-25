/**
 * Playlist page (/playlist/[id]): yours to edit, or someone's public playlist
 * (guests can open shared links — see PUBLIC_APP_PATHS). Public playlists get
 * a rich link preview (Day 10); private ones show the generic one.
 */
import PlaylistView from "@/components/features/playlist/PlaylistView";
import { buildShareMetadata } from "@/lib/og/shareMetadata";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return buildShareMetadata("playlist", id, `/playlist/${id}`, "Playlist");
}

export default async function PlaylistPage({ params }) {
  const { id } = await params;
  return <PlaylistView playlistId={id} />;
}
