/**
 * Home (/home): the personal For You feed (Day 8) plus New Releases,
 * SelfVibe Official and From the Community rows (Day 7). The All / Official /
 * Community switch sits next to the title.
 */
import PageHeader from "@/components/ui/PageHeader";
import CatalogSwitch from "@/components/features/browse/CatalogSwitch";
import HomeFeed from "@/components/features/home/HomeFeed";

export const metadata = { title: "Home" };

export default function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow="Listen now"
        title="For You"
        subtitle="Music picked for your taste, mood and time of day."
        actions={<CatalogSwitch />}
      />
      <HomeFeed />
    </>
  );
}
