"use client";

/**
 * Comments for a song (PRD 10.15.1): Newest / Top sort, a composer for
 * signed-in users ("Log in to comment" for guests), and the comment list
 * with "Load more". Opened from track menus and Now Playing.
 */
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import FormAlert from "@/components/ui/FormAlert";
import CommentComposer from "@/components/features/comments/CommentComposer";
import CommentItem from "@/components/features/comments/CommentItem";
import { useLibrarySheetsStore } from "@/store/librarySheetsStore";
import { useAuthStore } from "@/store/authStore";
import { getComments, postComment } from "@/services/comment.service";
import { QUERY_KEYS } from "@/utils/constants";
import { cn, pluralize } from "@/utils/genericFunctions";
import { useAppSettings } from "@/hooks/useAppSettings";

const PAGE_SIZE = 20;
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "top", label: "Top" },
];

export default function CommentsSheet() {
  const { isFeatureOn } = useAppSettings();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const track = useLibrarySheetsStore((state) => state.commentsTrack);
  const close = useLibrarySheetsStore((state) => state.closeComments);
  const isSignedIn = useAuthStore((state) => state.status === "authenticated");
  const [sort, setSort] = useState("newest");
  // Read once: there is no track until the sheet is opened
  const trackId = track?.id ?? null;

  const query = useInfiniteQuery({
    queryKey: QUERY_KEYS.comments(trackId, sort),
    queryFn: ({ pageParam, signal }) =>
      getComments(trackId, { sort, page: pageParam, limit: PAGE_SIZE }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
    enabled: Boolean(trackId),
  });
  const comments = query.data?.pages.flatMap((page) => page.comments) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  const post = async (body) => {
    await postComment(trackId, { body });
    queryClient.invalidateQueries({ queryKey: ["comments", trackId] });
  };

  return (
    <Sheet
      open={Boolean(track)}
      onClose={close}
      title="Comments"
      description={
        track ? `${track.title}${total ? ` · ${pluralize(total, "comment")}` : ""}` : undefined
      }
      className="sm:max-w-2xl"
      footer={
        !isFeatureOn("comments") ? (
          <p className="text-center text-sm text-fg-subtle">New comments are paused right now.</p>
        ) : isSignedIn ? (
          <CommentComposer onSubmit={post} />
        ) : (
          <Button href={`/login?next=${encodeURIComponent(pathname)}`} fullWidth onClick={close}>
            Log in to comment
          </Button>
        )
      }
    >
      <div role="tablist" aria-label="Sort comments" className="mb-2 flex gap-2">
        {SORTS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={sort === option.value}
            onClick={() => setSort(option.value)}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm transition",
              sort === option.value
                ? "border-neon bg-neon-dim text-fg"
                : "border-line text-fg-muted hover:border-line-strong"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <div className="space-y-4 py-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="space-y-3 py-4">
          <FormAlert message={query.error?.message ?? "Couldn't load comments."} />
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <MessageCircle size={28} className="text-neon" aria-hidden />
          <p className="mt-3 font-semibold">No comments yet</p>
          <p className="mt-1 text-sm text-fg-muted">
            Be the first to say something about this song.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} trackId={trackId} />
          ))}
        </div>
      )}

      {query.hasNextPage && (
        <Button
          variant="ghost"
          fullWidth
          onClick={() => query.fetchNextPage()}
          loading={query.isFetchingNextPage}
          className="mt-2"
        >
          Load more comments
        </Button>
      )}
    </Sheet>
  );
}
