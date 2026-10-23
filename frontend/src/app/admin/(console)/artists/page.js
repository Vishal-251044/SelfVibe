/**
 * Console → Artists & Albums (/admin/artists).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import AdminArtistList from "@/components/features/admin/artists/AdminArtistList";

export const metadata = { title: "Artists & Albums" };

export default function AdminArtistsPage() {
  return (
    <RequirePermission permission="catalog.edit">
      <AdminArtistList />
    </RequirePermission>
  );
}
