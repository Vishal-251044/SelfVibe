/**
 * Active genres and vibes for track / artist forms.
 * Creators read them from the onboarding options; staff from the console API.
 */
import { useQuery } from "@tanstack/react-query";
import { getOnboardingOptions } from "@/services/onboarding.service";
import { getAdminTaxonomy } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";

const TAXONOMY_STALE_MS = 10 * 60 * 1000; // genres and vibes rarely change

/**
 * @param {"user"|"staff"} [scope="user"]
 * @returns {{ genres: Object[], vibes: Object[], isPending: boolean, isError: boolean, refetch: Function }}
 */
export function useTaxonomy(scope = "user") {
  const query = useQuery({
    queryKey: scope === "staff" ? QUERY_KEYS.adminTaxonomy : QUERY_KEYS.onboardingOptions,
    queryFn: ({ signal }) =>
      scope === "staff" ? getAdminTaxonomy({ signal }) : getOnboardingOptions({ signal }),
    staleTime: TAXONOMY_STALE_MS,
  });
  return {
    genres: query.data?.genres ?? [],
    vibes: query.data?.vibes ?? [],
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
