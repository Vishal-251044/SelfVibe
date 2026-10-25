/**
 * Console → Audit log (/admin/audit, roadmap Day 9).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import AuditLogViewer from "@/components/features/admin/audit/AuditLogViewer";

export const metadata = { title: "Audit log" };

export default function AdminAuditLogViewerPage() {
  return (
    <RequirePermission permission="audit.view">
      <AuditLogViewer />
    </RequirePermission>
  );
}
