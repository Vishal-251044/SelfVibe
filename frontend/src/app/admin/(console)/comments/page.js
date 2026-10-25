/**
 * Console → Comments (/admin/comments, roadmap Day 9).
 */
import { Suspense } from "react";
import ScreenLoader from "@/components/ui/ScreenLoader";
import RequirePermission from "@/components/features/admin/RequirePermission";
import CommentsManager from "@/components/features/admin/comments/CommentsManager";

export const metadata = { title: "Comments" };

export default function AdminCommentsPage() {
  return (
    <RequirePermission permission="reports.manage">
      {/* useSearchParams() (?trackId=) needs a Suspense boundary */}
      <Suspense fallback={<ScreenLoader />}>
        <CommentsManager />
      </Suspense>
    </RequirePermission>
  );
}
