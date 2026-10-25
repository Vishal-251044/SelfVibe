/**
 * Console → one song's performance (/admin/performance/[id], roadmap Day 9).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import TrackPerformance from "@/components/features/admin/performance/TrackPerformance";

export const metadata = { title: "Song performance" };

export default async function AdminTrackPerformancePage({ params }) {
  const { id } = await params;
  return (
    <RequirePermission permission="dashboard.view">
      <TrackPerformance trackId={id} />
    </RequirePermission>
  );
}
