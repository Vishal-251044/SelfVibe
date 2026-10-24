"use client";

/**
 * Text box for a new comment, a reply or an edit. Enter posts on desktop
 * (Shift+Enter for a new line); shows the API's message when a comment is
 * blocked (abuse filter, duplicates, rate limit).
 */
import { useState } from "react";
import { Send } from "lucide-react";
import FormAlert from "@/components/ui/FormAlert";
import { cn } from "@/utils/genericFunctions";

const MAX_LENGTH = 1000;

/**
 * @param {Object} props
 * @param {(body: string) => Promise<void>} props.onSubmit - Throws on failure
 * @param {string} [props.placeholder="Add a comment…"]
 * @param {string} [props.initialValue=""]
 * @param {string} [props.submitLabel="Post"]
 * @param {() => void} [props.onCancel] - Shows a Cancel button (replies, edits)
 * @param {boolean} [props.autoFocus=false]
 * @param {string} [props.className]
 */
export default function CommentComposer({
  onSubmit,
  placeholder = "Add a comment…",
  initialValue = "",
  submitLabel = "Post",
  onCancel,
  autoFocus = false,
  className,
}) {
  const [body, setBody] = useState(initialValue);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const trimmed = body.trim();

  const submit = async () => {
    if (!trimmed || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setBody("");
    } catch (requestError) {
      setError(requestError?.message ?? "Couldn't post your comment. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end gap-2 rounded-control border border-line bg-black px-3 py-2 focus-within:border-neon focus-within:shadow-glow-sm">
        <textarea
          value={body}
          rows={1}
          maxLength={MAX_LENGTH}
          placeholder={placeholder}
          aria-label={placeholder}
          autoFocus={autoFocus}
          onChange={(event) => {
            setBody(event.target.value);
            // Grow with the text, up to ~6 lines
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 144)}px`;
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              window.matchMedia("(pointer: fine)").matches
            ) {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape" && onCancel) onCancel();
          }}
          className="max-h-36 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base text-fg outline-none placeholder:text-fg-subtle sm:text-sm"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!trimmed || isSending}
          aria-label={submitLabel}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neon text-black transition hover:bg-neon-hover disabled:bg-surface-raised disabled:text-fg-subtle"
        >
          <Send size={16} aria-hidden />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 text-xs text-fg-subtle hover:text-fg"
          >
            Cancel
          </button>
        ) : (
          <span />
        )}
        {body.length > MAX_LENGTH * 0.8 && (
          <span className="text-xs text-fg-subtle tabular-nums">
            {body.length} / {MAX_LENGTH}
          </span>
        )}
      </div>
      <FormAlert message={error} />
    </div>
  );
}
