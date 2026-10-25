/**
 * Platform switches set by the Owner (roadmap Day 9): maintenance mode and
 * feature flags (comments, uploads, voice). Read from GET /settings/public,
 * refreshed every minute. While loading, every feature counts as on.
 */
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/services/platform.service";
import { QUERY_KEYS } from "@/utils/constants";

const REFRESH_MS = 60 * 1000;

/**
 * @returns {{ maintenance: { enabled: boolean, message: string }|null, isFeatureOn: (feature: "comments"|"uploads"|"voice") => boolean, updatedAt: number, refetch: Function }}
 */
export function useAppSettings() {
  const query = useQuery({
    queryKey: QUERY_KEYS.publicSettings,
    queryFn: ({ signal }) => getPublicSettings({ signal }),
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
  });
  return {
    maintenance: query.data?.maintenance ?? null,
    isFeatureOn: (feature) => query.data?.features?.[feature] !== false,
    updatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  };
}
