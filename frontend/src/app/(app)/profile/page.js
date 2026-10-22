/**
 * Profile (/profile): the signed-in user's account details and Log out.
 * Editing name, bio and avatar arrives on Day 3.
 */
import PageHeader from "@/components/ui/PageHeader";
import ProfileSummary from "@/components/features/profile/ProfileSummary";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader eyebrow="selfvibe whoami" title="Profile" />
      <ProfileSummary />
    </>
  );
}
