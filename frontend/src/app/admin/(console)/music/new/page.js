/**
 * Console → Add a track (/admin/music/new).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import AdminTrackCreateForm from "@/components/features/admin/music/AdminTrackCreateForm";

export const metadata = { title: "Add a track" };

export default function AdminNewTrackPage() {
  return (
    <RequirePermission permission="music.manage">
      <AdminTrackCreateForm />
    </RequirePermission>
  );
}
