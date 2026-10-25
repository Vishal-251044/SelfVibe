/**
 * Home (/home): Trending, New Releases, SelfVibe Official and From the
 * Community (roadmap Day 7). The personalised For You rows arrive on Day 8.
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
