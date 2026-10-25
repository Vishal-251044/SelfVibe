/**
 * Search (/search): typo-tolerant grouped search, voice, recent searches and
 * Browse by Vibe / Genre (roadmap Day 7). Old ?vibe= links go to the vibe page.
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";
import ScreenLoader from "@/components/ui/ScreenLoader";
import SearchView from "@/components/features/search/SearchView";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }) {
  const { vibe } = await searchParams;
  if (typeof vibe === "string" && /^[a-z0-9-]{1,60}$/.test(vibe)) redirect(`/browse/vibe/${vibe}`);

  // useSearchParams() needs a Suspense boundary
  return (
    <Suspense fallback={<ScreenLoader />}>
      <SearchView />
    </Suspense>
  );
}
