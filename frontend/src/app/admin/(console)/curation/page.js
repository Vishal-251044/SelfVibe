/**
 * Console → Curation (/admin/curation, roadmap Day 9).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import CurationManager from "@/components/features/admin/curation/CurationManager";

export const metadata = { title: "Curation" };

export default function AdminCurationManagerPage() {
  return (
    <RequirePermission permission="curation.manage">
      <CurationManager />
    </RequirePermission>
  );
}
