/**
 * Public artist page (/artist/[id]). `id` may be the artist's slug or id.
 * Guests can open it from a shared link (see PUBLIC_APP_PATHS); link previews
 * get the artist's name, bio and image (Day 10).
 */
import ArtistPageView from "@/components/features/artist/ArtistPageView";
import { buildShareMetadata } from "@/lib/og/shareMetadata";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const key = decodeURIComponent(id);
  return buildShareMetadata("artist", key, `/artist/${encodeURIComponent(key)}`, "Artist");
}

export default async function ArtistPage({ params }) {
  const { id } = await params;
  return <ArtistPageView idOrSlug={decodeURIComponent(id)} />;
}
