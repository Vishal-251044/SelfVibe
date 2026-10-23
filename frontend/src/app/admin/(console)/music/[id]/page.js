/**
 * Console → One track (/admin/music/[id]).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import AdminTrackDetail from "@/components/features/admin/music/AdminTrackDetail";

export const metadata = { title: "Track" };

export default async function AdminTrackPage({ params }) {
  const { id } = await params;
  return (
    <RequirePermission permission="catalog.edit">
      <AdminTrackDetail trackId={id} />
    </RequirePermission>
  );
}
