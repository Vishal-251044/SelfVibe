/**
 * Console → One artist (/admin/artists/[id]).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import AdminArtistDetail from "@/components/features/admin/artists/AdminArtistDetail";

export const metadata = { title: "Artist" };

export default async function AdminArtistPage({ params }) {
  const { id } = await params;
  return (
    <RequirePermission permission="catalog.edit">
      <AdminArtistDetail artistId={id} />
    </RequirePermission>
  );
}
