/**
 * Layout for all signed-in app screens (home, search, library, …).
 * Route protection (redirect to /login) is added on Day 2.
 */
import AppShell from "@/components/layout/AppShell";

export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
