/**
 * Song page (/track/[id], roadmap Day 10 share links): what a shared song link
 * opens. Guests see the song and a sign-up prompt; listeners can play it,
 * like it, share it and find more like it. Link previews show the cover.
 */
import TrackView from "@/components/features/music/TrackView";
import { buildShareMetadata } from "@/lib/og/shareMetadata";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return buildShareMetadata("track", id, `/track/${id}`, "Song");
}

export default async function TrackPage({ params }) {
  const { id } = await params;
  return <TrackView trackId={id} />;
}
