/**
 * Console → Settings (/admin/settings, roadmap Day 9).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import SettingsManager from "@/components/features/admin/settings/SettingsManager";

export const metadata = { title: "Settings" };

export default function AdminSettingsManagerPage() {
  return (
    <RequirePermission permission="settings.manage">
      <SettingsManager />
    </RequirePermission>
  );
}
