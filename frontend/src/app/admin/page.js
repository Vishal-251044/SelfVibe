/**
 * Owner / Admin console entry (/admin). Private: not linked from the public site
 * and hidden from search engines. Staff login with 2FA and the console layout
 * are built on Day 2.
 */
import { ShieldCheck } from "lucide-react";
import Logo from "@/components/ui/Logo";
import GridBackground from "@/components/ui/GridBackground";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = {
  title: "Console",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="pt-safe pb-safe px-safe relative isolate flex min-h-dvh flex-col items-center justify-center gap-10 py-12">
      <GridBackground intensity={0.2} />
      <Logo href={null} size="lg" />
      <EmptyState
        icon={ShieldCheck}
        command="selfvibe console"
        title="access restricted"
        description="The SelfVibe console is for staff only. Sign-in requires a staff account and two-factor authentication."
        className="w-full max-w-lg bg-black/80"
      />
    </div>
  );
}
