/**
 * Layout for the taste quiz (/onboarding): signed-in only, full screen
 * (no app navigation), neon grid background.
 */
import GridBackground from "@/components/ui/GridBackground";
import AuthGuard from "@/components/features/auth/AuthGuard";

export const metadata = { title: "Your taste" };

export default function OnboardingLayout({ children }) {
  return (
    <div className="relative isolate min-h-dvh">
      <GridBackground intensity={0.14} />
      <AuthGuard allowIncompleteOnboarding>{children}</AuthGuard>
    </div>
  );
}
