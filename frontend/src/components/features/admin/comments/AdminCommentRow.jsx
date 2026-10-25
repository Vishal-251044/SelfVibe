"use client";

/**
 * One comment in the console (PRD 10.15, roadmap Day 9): who wrote it, on
 * which song, report count, and the actions — hide / unhide, pin / unpin,
 * delete (confirmed) and reply as SelfVibe.
 */
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Flag, MessageSquareReply, Pin, PinOff, Trash2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import TextAreaField from "@/components/ui/TextAreaField";
import { moderateComment, replyAsSelfVibe } from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import { cn, formatRelativeTime } from "@/utils/genericFunctions";

const STATUS_TONE = { visible: "success", hidden: "warning", removed: "danger" };
const ACTION_DONE = {
  hide: "comment hidden",
  unhide: "comment visible again",
  pin: "comment pinned",
  unpin: "comment unpinned",
  delete: "comment deleted",
};

/**
 * @param {Object} props
 * @param {Object} props.comment - Admin comment shape
 * @param {boolean} [props.showTrack=true]
 */
export default function AdminCommentRow({ comment, showTrack = true }) {
  const queryClient = useQueryClient();
  const [isReplying, setIsReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  const act = useMutation({
    mutationFn: (action) => moderateComment(comment.id, action),
    onSuccess: (_, action) => {
      setIsConfirmingDelete(false);
      showToast({
        command: `selfvibe comments --${action}`,
        message: ACTION_DONE[action],
        tone: "success",
      });
      refresh();
    },
    onError: (error) =>
      showToast({
        command: "selfvibe comments",
        message: error?.message ?? "couldn't update",
        tone: "error",
      }),
  });
  const send = useMutation({
    mutationFn: () => replyAsSelfVibe(comment.id, reply.trim()),
    onSuccess: () => {
      setReply("");
      setIsReplying(false);
      showToast({
        command: "selfvibe comments --reply",
        message: "replied as SelfVibe",
        tone: "success",
      });
      refresh();
    },
  });

  const isRemoved = comment.status === "removed";
  const iconButton =
    "flex size-11 items-center justify-center rounded-full text-fg-muted transition hover:bg-neon-dim hover:text-neon disabled:opacity-40";

  return (
    <article
      className={cn(
        "rounded-card border bg-surface p-3 sm:p-4",
        comment.reportsCount ? "border-warning/40" : "border-line"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={comment.author?.name} src={comment.author?.avatar} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium text-fg">{comment.author?.name ?? "Deleted user"}</span>
            {comment.author?.isStaff && <Badge tone="success">SelfVibe</Badge>}
            {comment.isReply && <Badge tone="muted">Reply</Badge>}
            {comment.isPinned && <Badge tone="info">Pinned</Badge>}
            <Badge tone={STATUS_TONE[comment.status]}>{comment.status}</Badge>
            {comment.reportsCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-warning">
                <Flag size={12} aria-hidden /> {comment.reportsCount} report
                {comment.reportsCount > 1 ? "s" : ""}
              </span>
            )}
            <span className="text-xs text-fg-subtle">{formatRelativeTime(comment.createdAt)}</span>
          </p>
          <p
            className={cn(
              "mt-1 text-sm break-words whitespace-pre-line",
              isRemoved ? "text-fg-subtle line-through" : "text-fg-muted"
            )}
          >
            {comment.body}
          </p>
          {showTrack && comment.track && (
            <Link
              href={`/admin/performance/${comment.track.id}`}
              className="mt-1 inline-flex min-h-11 items-center text-xs text-fg-subtle hover:text-neon"
            >
              on {comment.track.title}
            </Link>
          )}
        </div>
      </div>

      {!isRemoved && (
        <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-line pt-2">
          {comment.status === "hidden" ? (
            <button
              type="button"
              className={iconButton}
              onClick={() => act.mutate("unhide")}
              disabled={act.isPending}
              aria-label="Show comment again"
              title="Unhide"
            >
              <Eye size={16} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              className={iconButton}
              onClick={() => act.mutate("hide")}
              disabled={act.isPending}
              aria-label="Hide comment"
              title="Hide"
            >
              <EyeOff size={16} aria-hidden />
            </button>
          )}
          {!comment.isReply && comment.status === "visible" && (
            <button
              type="button"
              className={iconButton}
              onClick={() => act.mutate(comment.isPinned ? "unpin" : "pin")}
              disabled={act.isPending}
              aria-label={comment.isPinned ? "Unpin comment" : "Pin comment"}
              title={comment.isPinned ? "Unpin" : "Pin"}
            >
              {comment.isPinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}
            </button>
          )}
          {comment.status === "visible" && (
            <button
              type="button"
              className={iconButton}
              onClick={() => setIsReplying((open) => !open)}
              aria-label="Reply as SelfVibe"
              title="Reply as SelfVibe"
              aria-expanded={isReplying}
            >
              <MessageSquareReply size={16} aria-hidden />
            </button>
          )}
          <button
            type="button"
            className={cn(iconButton, "ml-auto hover:text-danger")}
            onClick={() => setIsConfirmingDelete(true)}
            aria-label="Delete comment"
            title="Delete"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      )}

      {isReplying && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (reply.trim()) send.mutate();
          }}
        >
          <TextAreaField
            label="Reply as SelfVibe"
            value={reply}
            maxLength={500}
            rows={2}
            onChange={(event) => setReply(event.target.value)}
            error={send.error?.message}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsReplying(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={send.isPending} disabled={!reply.trim()}>
              Post reply
            </Button>
          </div>
        </form>
      )}

      <ConfirmSheet
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={() => act.mutate("delete")}
        title="Delete this comment?"
        description="It is replaced by “Comment deleted” for listeners. This can't be undone."
        loading={act.isPending}
        error={act.error?.message ?? null}
      />
    </article>
  );
}
