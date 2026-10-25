/**
 * Console → Genres & Vibes (/admin/genres, roadmap Day 7).
 */
import RequirePermission from "@/components/features/admin/RequirePermission";
import TaxonomyManager from "@/components/features/admin/taxonomy/TaxonomyManager";

export const metadata = { title: "Genres & Vibes" };

export default function AdminGenresPage() {
  return (
    <RequirePermission permission="genres.manage">
      <TaxonomyManager />
    </RequirePermission>
  );
}
