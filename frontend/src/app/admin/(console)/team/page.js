/**
 * Console → Team (/admin/team, roadmap Day 9).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import TeamManager from "@/components/features/admin/team/TeamManager";

export const metadata = { title: "Team" };

export default function AdminTeamManagerPage() {
  return (
    <RequirePermission permission="team.manage">
      <TeamManager />
    </RequirePermission>
  );
}
