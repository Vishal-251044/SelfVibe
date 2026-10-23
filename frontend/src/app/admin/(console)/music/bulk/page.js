/**
 * Console → Bulk upload (/admin/music/bulk).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import BulkUploader from "@/components/features/admin/music/BulkUploader";

export const metadata = { title: "Bulk upload" };

export default function AdminBulkUploadPage() {
  return (
    <RequirePermission permission="music.manage">
      <BulkUploader />
    </RequirePermission>
  );
}
