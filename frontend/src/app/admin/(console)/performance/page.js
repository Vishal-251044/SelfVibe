/**
 * Console → Song performance (/admin/performance, roadmap Day 9).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import PerformanceList from "@/components/features/admin/performance/PerformanceList";

export const metadata = { title: "Song performance" };

export default function AdminPerformancePage() {
  return (
    <RequirePermission permission="dashboard.view">
      <PerformanceList />
    </RequirePermission>
  );
}
