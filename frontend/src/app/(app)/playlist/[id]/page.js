/**
 * Playlist detail (/playlist/[id]). Playlist data is connected on Day 6.
 */
import { ListMusic } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";

export const metadata = { title: "Playlist" };

export default async function PlaylistPage({ params }) {
  const { id } = await params;

  return (
    <EmptyState
      icon={ListMusic}
      command={`selfvibe playlist --open ${id}`}
      title="playlist not available"
      description="This playlist could not be loaded. It may be private or no longer exist."
      action={<Button href="/library">Go to your library</Button>}
    />
  );
}
