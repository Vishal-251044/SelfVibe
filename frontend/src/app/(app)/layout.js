/**
 * Layout for all signed-in app screens (home, search, library, …).
 * Signed-out visitors are redirected to /login by src/proxy.js and AuthGuard
 * (inside AppShell).
 */
import AppShell from "@/components/layout/AppShell";

export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
