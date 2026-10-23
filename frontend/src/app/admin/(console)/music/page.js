/**
 * Console → Music (/admin/music): the catalog list.
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import AdminTrackList from "@/components/features/admin/music/AdminTrackList";

export const metadata = { title: "Music" };

export default function AdminMusicPage() {
  return (
    <RequirePermission permission="catalog.edit">
      <AdminTrackList />
    </RequirePermission>
  );
}
