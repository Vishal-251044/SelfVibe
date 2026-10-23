"use client";

/**
 * /creator entry: shows "Become a Creator" for listeners and the studio for
 * creators (based on whether an artist profile exists).
 */
import { useQuery } from "@tanstack/react-query";
import { Mic2 } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import BecomeCreatorForm from "@/components/features/creator/BecomeCreatorForm";
import CreatorDashboard from "@/components/features/creator/CreatorDashboard";
import { getMyArtist } from "@/services/creator.service";
import { useAuthStore } from "@/store/authStore";
import { QUERY_KEYS } from "@/utils/constants";

/**
 * Load my artist profile (shared by the studio pages).
 * @returns {import("@tanstack/react-query").UseQueryResult<{ artist: Object|null }>}
 */
export function useMyArtist() {
  return useQuery({
    queryKey: QUERY_KEYS.myArtist,
    queryFn: ({ signal }) => getMyArtist({ signal }),
  });
}

/** Skeleton shaped like the studio header + list. */
export function CreatorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading creator studio" className="space-y-6">
      <Skeleton className="h-10 w-64 max-w-full" />
      <Skeleton className="h-28 w-full rounded-card" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-control" />
      ))}
    </div>
  );
}

export default function CreatorHome() {
  const isCreator = useAuthStore((state) => state.user?.roles?.includes("creator"));
  const { data, isPending, isError, error, refetch } = useMyArtist();

  if (isPending) return <CreatorSkeleton />;
  if (isError) {
    return (
      <EmptyState
        icon={Mic2}
        command="selfvibe creator --status"
        title="couldn't load your studio"
        description={error?.message}
        action={<Button onClick={() => refetch()}>Try again</Button>}
      />
    );
  }
  return data.artist && isCreator ? (
    <CreatorDashboard artist={data.artist} />
  ) : (
    <BecomeCreatorForm />
  );
}
