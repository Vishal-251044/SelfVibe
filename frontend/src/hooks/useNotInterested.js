/**
 * "Not interested" on a recommended song (PRD 10.4.4 feedback loop, roadmap
 * Day 8): the card disappears from every feed section at once, the server
 * lowers the song's tags, and a toast offers Undo.
 */
import { useQueryClient } from "@tanstack/react-query";
import { markNotInterested, undoNotInterested } from "@/services/feed.service";
import { showToast } from "@/store/toastStore";
import { QUERY_KEYS } from "@/utils/constants";

const FEED_PREFIX = QUERY_KEYS.forYouAll;

/**
 * @returns {(track: { id: string, title: string }) => void}
 */
export function useNotInterested() {
  const queryClient = useQueryClient();

  return (track) => {
    // Optimistic: remove from every cached feed (any catalog)
    const snapshots = queryClient.getQueriesData({ queryKey: FEED_PREFIX });
    queryClient.setQueriesData({ queryKey: FEED_PREFIX }, (feed) =>
      feed
        ? {
            ...feed,
            sections: feed.sections.map((section) =>
              section.key === "jumpBackIn"
                ? section
                : { ...section, items: section.items.filter((item) => item.id !== track.id) }
            ),
          }
        : feed
    );

    const restore = () => snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    markNotInterested(track.id)
      .then(() =>
        showToast({
          id: `not-interested-${track.id}`,
          message: "we'll show you less like this",
          tone: "success",
          durationMs: 6000,
          action: {
            label: "Undo",
            onClick: () => {
              restore();
              undoNotInterested(track.id)
                .catch(() => {})
                .finally(() => queryClient.invalidateQueries({ queryKey: FEED_PREFIX }));
            },
          },
        })
      )
      .catch((error) => {
        restore();
        showToast({
          message: error?.message ?? "couldn't hide that song",
          tone: "error",
        });
      });
  };
}
