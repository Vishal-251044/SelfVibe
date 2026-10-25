/**
 * Genre page (/browse/genre/[slug], PRD BRW-1): its songs, most played first.
 */
import CategoryView from "@/components/features/browse/CategoryView";

export const metadata = { title: "Genre" };

export default async function GenrePage({ params }) {
  const { slug } = await params;
  return <CategoryView kind="genre" slug={slug} />;
}
