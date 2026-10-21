/**
 * Loading skeleton shown while any app screen is loading.
 */
import Skeleton from "@/components/ui/Skeleton";

export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className="mb-10 h-10 w-64 max-w-full" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index}>
            <Skeleton className="aspect-square w-full rounded-card" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
