/**
 * Console → Users & Creators (/admin/users, roadmap Day 9).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import UsersManager from "@/components/features/admin/users/UsersManager";

export const metadata = { title: "Users & Creators" };

export default function AdminUsersManagerPage() {
  return (
    <RequirePermission permission="users.manage">
      <UsersManager />
    </RequirePermission>
  );
}
