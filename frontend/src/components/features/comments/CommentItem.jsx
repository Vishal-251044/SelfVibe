"use client";

/**
 * One comment (PRD CMT-1/2): author, "Artist" / "SelfVibe" label, time, text,
 * like, reply, edit / delete for your own, report for others. Top-level
 * comments can expand their replies.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Heart, MessageCircle, Pencil, Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import ReportButton from "@/components/features/music/ReportButton";
import CommentComposer from "@/components/features/comments/CommentComposer";
import { useAuthStore } from "@/store/authStore";
import {
  deleteComment,
  editComment,
  getReplies,
  postComment,
  setCommentLike,
} from "@/services/comment.service";
import { QUERY_KEYS } from "@/utils/constants";
import { cn, formatRelativeTime, pluralize } from "@/utils/genericFunctions";
import { slideDown } from "@/utils/animations";

const LABELS = {
  artist: { text: "Artist", tone: "success" },
  selfvibe: { text: "SelfVibe", tone: "info" },
};

/**
 * "View 3 replies" / "Hide replies".
 * @param {{ count: number, isOpen: boolean, onToggle: () => void }} props
 */
function RepliesToggle({ count, isOpen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="mt-1 min-h-11 text-xs font-medium text-neon hover:text-neon-hover"
    >
      {isOpen ? "Hide replies" : `View ${pluralize(count, "reply", "replies")}`}
    </button>
  );
}

/**
 * Replies under a comment.
 * @param {{ query: import("@tanstack/react-query").UseQueryResult, trackId: string }} props
 */
function RepliesList({ query, trackId }) {
  return (
    <motion.div
      variants={slideDown}
      initial="hidden"
      animate="visible"
      className="mt-1 space-y-1 border-l border-line pl-3 sm:pl-4"
    >
      {query.isPending ? (
        <p className="py-2 text-xs text-fg-subtle">Loading replies…</p>
      ) : (
        query.data?.replies.map((reply) => (
          <CommentItem key={reply.id} comment={reply} trackId={trackId} isReply />
        ))
      )}
    </motion.div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.comment - From the API
 * @param {string} props.trackId
 * @param {boolean} [props.isReply=false]
 */
export default function CommentItem({ comment, trackId, isReply = false }) {
  const queryClient = useQueryClient();
  const viewer = useAuthStore((state) => state.user);
  const [mode, setMode] = useState(null); // "reply" | "edit" | null
  const [showReplies, setShowReplies] = useState(false);
  const [liked, setLiked] = useState({ liked: comment.likedByMe, count: comment.likeCount });
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isMine = Boolean(viewer && comment.author?.id === viewer.id);
  const label = comment.label ? LABELS[comment.label] : null;

  const replies = useQuery({
    queryKey: QUERY_KEYS.replies(comment.id),
    queryFn: ({ signal }) => getReplies(comment.id, { signal }),
    enabled: showReplies && !isReply,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["comments", trackId] });
    queryClient.invalidateQueries({ queryKey: ["comments", "replies"] });
  };

  const toggleLike = async () => {
    if (!viewer) return;
    const next = !liked.liked;
    setLiked({ liked: next, count: liked.count + (next ? 1 : -1) }); // optimistic
    try {
      const result = await setCommentLike(comment.id, next);
      setLiked({ liked: result.liked, count: result.likeCount });
    } catch {
      setLiked(liked);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteComment(comment.id);
      setIsConfirmingDelete(false);
      refresh();
    } catch (error) {
      setDeleteError(error?.message ?? "Couldn't delete it. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (comment.isRemoved) {
    return (
      <div className="py-3">
        <p className="text-sm text-fg-subtle italic">Comment deleted</p>
        {comment.replyCount > 0 && (
          <RepliesToggle
            count={comment.replyCount}
            isOpen={showReplies}
            onToggle={() => setShowReplies((open) => !open)}
          />
        )}
        {showReplies && <RepliesList query={replies} trackId={trackId} />}
      </div>
    );
  }

  return (
    <article className="py-3" aria-label={`Comment by ${comment.author.name}`}>
      <div className="flex gap-3">
        <Avatar
          name={comment.author.name}
          src={comment.author.avatar}
          size="sm"
          className={isReply ? "size-8" : ""}
        />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-semibold text-fg">{comment.author.name}</span>
            {label && (
              <Badge tone={label.tone} className="px-2 py-0 text-[10px]">
                <BadgeCheck size={11} aria-hidden /> {label.text}
              </Badge>
            )}
            <span className="text-fg-subtle">
              {formatRelativeTime(comment.createdAt)}
              {comment.editedAt && " · edited"}
            </span>
          </p>

          {mode === "edit" ? (
            <CommentComposer
              className="mt-2"
              initialValue={comment.body}
              submitLabel="Save"
              autoFocus
              onCancel={() => setMode(null)}
              onSubmit={async (body) => {
                await editComment(comment.id, body);
                setMode(null);
                refresh();
              }}
            />
          ) : (
            <p className="mt-1 text-sm break-words whitespace-pre-line text-fg-muted">
              {comment.body}
            </p>
          )}

          <div className="-ml-3 flex flex-wrap items-center">
            <button
              type="button"
              onClick={toggleLike}
              disabled={!viewer}
              aria-pressed={liked.liked}
              aria-label={liked.liked ? "Unlike comment" : "Like comment"}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs transition",
                liked.liked ? "text-neon" : "text-fg-subtle hover:text-fg"
              )}
            >
              <Heart size={14} fill={liked.liked ? "currentColor" : "none"} aria-hidden />
              {liked.count > 0 && <span className="tabular-nums">{liked.count}</span>}
            </button>
            {viewer && (
              <button
                type="button"
                onClick={() => setMode(mode === "reply" ? null : "reply")}
                className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs text-fg-subtle hover:text-fg"
              >
                <MessageCircle size={14} aria-hidden /> Reply
              </button>
            )}
            {isMine && mode !== "edit" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  aria-label="Edit comment"
                  className="flex size-11 items-center justify-center rounded-full text-fg-subtle hover:text-fg"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  aria-label="Delete comment"
                  className="flex size-11 items-center justify-center rounded-full text-fg-subtle hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            {viewer && !isMine && (
              <ReportButton
                targetType="comment"
                targetId={comment.id}
                targetName={`comment by ${comment.author.name}`}
              />
            )}
          </div>

          <AnimatePresence initial={false}>
            {mode === "reply" && (
              <motion.div variants={slideDown} initial="hidden" animate="visible" exit="exit">
                <CommentComposer
                  className="mt-1"
                  placeholder={`Reply to ${comment.author.name}…`}
                  submitLabel="Reply"
                  autoFocus
                  onCancel={() => setMode(null)}
                  onSubmit={async (body) => {
                    await postComment(trackId, { body, parentId: comment.parentId ?? comment.id });
                    setMode(null);
                    setShowReplies(true);
                    refresh();
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!isReply && comment.replyCount > 0 && (
            <RepliesToggle
              count={comment.replyCount}
              isOpen={showReplies}
              onToggle={() => setShowReplies((open) => !open)}
            />
          )}
          {showReplies && !isReply && <RepliesList query={replies} trackId={trackId} />}
        </div>
      </div>

      <ConfirmSheet
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={confirmDelete}
        loading={isDeleting}
        error={deleteError}
        title="Delete this comment?"
        description="It will be removed for everyone. Replies under it stay."
      />
    </article>
  );
}
