/**
 * Public artist page (/artist/[id]). `id` may be the artist's slug or id.
 * Guests can open it from a shared link (see PUBLIC_APP_PATHS).
 */
import ArtistPageView from "@/components/features/artist/ArtistPageView";

export const metadata = { title: "Artist" };

export default async function ArtistPage({ params }) {
  const { id } = await params;
  return <ArtistPageView idOrSlug={decodeURIComponent(id)} />;
}
