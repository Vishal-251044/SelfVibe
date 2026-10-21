/**
 * Profile (/profile): view and edit name, bio and avatar.
 * Shows a sign-in prompt until auth is connected on Day 2; editing arrives on Day 3.
 */
import { UserRound } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import FadeIn from "@/components/animations/FadeIn";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader eyebrow="selfvibe whoami" title="Profile" />
      <FadeIn delay={0.05}>
        <EmptyState
          icon={UserRound}
          command="selfvibe whoami"
          title="not logged in"
          description="Log in to see your profile, your taste and your listening stats."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/login">Log in</Button>
              <Button href="/signup" variant="outline">
                Create account
              </Button>
            </div>
          }
        />
      </FadeIn>
    </>
  );
}
