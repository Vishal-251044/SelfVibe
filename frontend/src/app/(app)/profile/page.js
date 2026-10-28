/**
 * Profile (/profile): view and edit name, bio and avatar; taste profile; Log out.
 */
import PageHeader from "@/components/ui/PageHeader";
import ProfileSummary from "@/components/features/profile/ProfileSummary";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader eyebrow="Your account" title="Profile" />
      <ProfileSummary />
    </>
  );
}
