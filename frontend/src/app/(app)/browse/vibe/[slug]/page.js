/**
 * Vibe page (/browse/vibe/[slug], PRD BRW-2): its songs, most played first.
 */
import CategoryView from "@/components/features/browse/CategoryView";

export const metadata = { title: "Vibe" };

export default async function VibePage({ params }) {
  const { slug } = await params;
  return <CategoryView kind="vibe" slug={slug} />;
}
