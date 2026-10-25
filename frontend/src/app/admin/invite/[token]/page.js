/**
 * Staff invite (/admin/invite/[token], roadmap Day 9 Team): accept an invite
 * to the console. Open without a console session.
 */
import Logo from "@/components/ui/Logo";
import GridBackground from "@/components/ui/GridBackground";
import FadeIn from "@/components/animations/FadeIn";
import AcceptInvite from "@/components/features/admin/team/AcceptInvite";

export const metadata = { title: "Join the team" };

export default async function AcceptInvitePage({ params }) {
  const { token } = await params;
  return (
    <div className="pt-safe pb-safe px-safe relative isolate flex min-h-dvh flex-col items-center justify-center gap-8 py-10">
      <GridBackground intensity={0.22} />
      <Logo href={null} />
      <FadeIn className="w-full max-w-md rounded-card border border-line-strong bg-black/85 p-6 shadow-glow-lg backdrop-blur-xl sm:p-10">
        <AcceptInvite token={token} />
      </FadeIn>
    </div>
  );
}
