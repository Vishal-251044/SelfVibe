/**
 * Like and follow state for the whole app (roadmap Day 6, PRD LIB-1 / LIB-4).
 * The liked-track and followed-artist id lists are loaded once and shared by
 * every heart / Follow button; toggling updates them instantly (optimistic)
 * and rolls back if the request fails.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  followArtist,
  getFollowedArtistIds,
  getLikedTrackIds,
  likeTrack,
  unfollowArtist,
  unlikeTrack,
} from "@/services/library.service";
import { QUERY_KEYS } from "@/utils/constants";

const IDS_STALE_MS = 5 * 60 * 1000;

/** @returns {boolean} Whether a listener is signed in */
function useIsSignedIn() {
  return useAuthStore((state) => state.status === "authenticated");
}

/**
 * Send guests to log in, coming back here afterwards.
 * @returns {() => void}
 */
function useLoginRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  return () => router.push(`/login?next=${encodeURIComponent(pathname)}`);
}

/**
 * Optimistic toggle of an id in a cached `{ [field]: string[] }` list.
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {readonly unknown[]} queryKey
 * @param {string} field - "trackIds" | "artistIds"
 * @param {string} id
 * @param {boolean} include
 * @returns {Promise<unknown>} The previous cache value (for rollback)
 */
async function toggleCachedId(queryClient, queryKey, field, id, include) {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData(queryKey);
  queryClient.setQueryData(queryKey, (current) => {
    const ids = (current?.[field] ?? []).filter((item) => item !== id);
    return { [field]: include ? [id, ...ids] : ids };
  });
  return previous;
}

/**
 * Is this song liked, and a function to like / unlike it.
 * @param {string} trackId
 * @returns {{ isLiked: boolean, toggle: () => void, isPending: boolean }}
 */
export function useTrackLike(trackId) {
  const queryClient = useQueryClient();
  const isSignedIn = useIsSignedIn();
  const goToLogin = useLoginRedirect();
  const { data } = useQuery({
    queryKey: QUERY_KEYS.likedIds,
    queryFn: ({ signal }) => getLikedTrackIds({ signal }),
    enabled: isSignedIn,
    staleTime: IDS_STALE_MS,
  });
  const isLiked = Boolean(data?.trackIds?.includes(trackId));

  const mutation = useMutation({
    mutationFn: (like) => (like ? likeTrack(trackId) : unlikeTrack(trackId)),
    onMutate: async (like) => ({
      previous: await toggleCachedId(queryClient, QUERY_KEYS.likedIds, "trackIds", trackId, like),
    }),
    onError: (_error, _like, context) => {
      queryClient.setQueryData(QUERY_KEYS.likedIds, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likedTracks });
    },
  });

  return {
    isLiked,
    isPending: mutation.isPending,
    toggle: () => (isSignedIn ? mutation.mutate(!isLiked) : goToLogin()),
  };
}

/**
 * Do I follow this artist, and a function to follow / unfollow.
 * @param {string} artistId
 * @returns {{ isFollowing: boolean, toggle: () => void, isPending: boolean, followersCount: number|null }}
 */
export function useArtistFollow(artistId) {
  const queryClient = useQueryClient();
  const isSignedIn = useIsSignedIn();
  const goToLogin = useLoginRedirect();
  const { data } = useQuery({
    queryKey: QUERY_KEYS.followIds,
    queryFn: ({ signal }) => getFollowedArtistIds({ signal }),
    enabled: isSignedIn,
    staleTime: IDS_STALE_MS,
  });
  const isFollowing = Boolean(data?.artistIds?.includes(artistId));

  const mutation = useMutation({
    mutationFn: (follow) => (follow ? followArtist(artistId) : unfollowArtist(artistId)),
    onMutate: async (follow) => ({
      previous: await toggleCachedId(
        queryClient,
        QUERY_KEYS.followIds,
        "artistIds",
        artistId,
        follow
      ),
    }),
    onError: (_error, _follow, context) => {
      queryClient.setQueryData(QUERY_KEYS.followIds, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.follows });
      queryClient.invalidateQueries({ queryKey: ["artists"] }); // follower counts on artist pages
    },
  });

  return {
    isFollowing,
    isPending: mutation.isPending,
    followersCount: mutation.data?.followersCount ?? null,
    toggle: () => (isSignedIn ? mutation.mutate(!isFollowing) : goToLogin()),
  };
}
