/**
 * Console → Moderation (/admin/moderation, roadmap Day 9).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import ModerationQueue from "@/components/features/admin/moderation/ModerationQueue";

export const metadata = { title: "Moderation" };

export default function AdminModerationQueuePage() {
  return (
    <RequirePermission permission="reports.manage">
      <ModerationQueue />
    </RequirePermission>
  );
}
