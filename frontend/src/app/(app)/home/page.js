/**
 * Home (/home): the personal For You feed (Day 8) plus New Releases,
 * SelfVibe Official and From the Community rows (Day 7).
 */
import PageHeader from "@/components/ui/PageHeader";
import HomeFeed from "@/components/features/home/HomeFeed";

export const metadata = { title: "Home" };

export default function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow="selfvibe feed --for-you"
        title="For You"
        subtitle="Music picked for your taste, mood and time of day."
      />
      <HomeFeed />
    </>
  );
}
