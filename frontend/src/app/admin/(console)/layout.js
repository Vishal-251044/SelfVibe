/**
 * Layout for signed-in console pages: guard, sidebar, top bar, idle sign-out.
 */
import AdminShell from "@/components/layout/admin/AdminShell";

export default function ConsoleLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
