/**
 * Public artist page (/artist/[id]). Artist data is connected on Day 4.
 */
import { Mic2 } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";

export const metadata = { title: "Artist" };

export default async function ArtistPage({ params }) {
  const { id } = await params;

  return (
    <EmptyState
      icon={Mic2}
      command={`selfvibe artist --open ${id}`}
      title="artist not available"
      description="This artist page could not be loaded. Try searching for the artist instead."
      action={<Button href="/search">Search artists</Button>}
    />
  );
}
