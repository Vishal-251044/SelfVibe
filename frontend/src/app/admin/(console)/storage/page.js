/**
 * Console → Storage (/admin/storage, roadmap Day 9).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import StorageManager from "@/components/features/admin/storage/StorageManager";

export const metadata = { title: "Storage" };

export default function AdminStorageManagerPage() {
  return (
    <RequirePermission permission="dashboard.view">
      <StorageManager />
    </RequirePermission>
  );
}
