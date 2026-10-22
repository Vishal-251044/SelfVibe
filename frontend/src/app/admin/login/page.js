/**
 * Console sign-in (/admin/login): password, then two-factor authentication.
 * Reachable only by URL — never linked from the public site.
 */
import { Suspense } from "react";
import Logo from "@/components/ui/Logo";
import GridBackground from "@/components/ui/GridBackground";
import ScreenLoader from "@/components/ui/ScreenLoader";
import FadeIn from "@/components/animations/FadeIn";
import AdminLoginFlow from "@/components/features/admin/AdminLoginFlow";

export const metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <div className="pt-safe pb-safe px-safe relative isolate flex min-h-dvh flex-col items-center justify-center gap-8 py-10">
      <GridBackground intensity={0.22} />
      <Logo href={null} />
      <FadeIn className="w-full max-w-md rounded-card border border-line-strong bg-black/85 p-6 shadow-glow-lg backdrop-blur-xl sm:p-10">
        <Suspense fallback={<ScreenLoader className="min-h-80" />}>
          <AdminLoginFlow />
        </Suspense>
      </FadeIn>
      <p className="text-xs text-fg-subtle">Activity in the console is logged.</p>
    </div>
  );
}
