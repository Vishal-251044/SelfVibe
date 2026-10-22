"use client";

/**
 * Labelled multi-line text field with a live character counter and inline error.
 */
import { useId } from "react";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.value
 * @param {number} [props.maxLength] - Shows a "12 / 300" counter when set
 * @param {string} [props.error]
 * @param {string} [props.className] - Classes for the outer wrapper
 * Any other props are passed to the <textarea>.
 */
export default function TextAreaField({
  label,
  value,
  maxLength,
  error,
  className,
  ...textareaProps
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const isNearLimit = maxLength && value.length > maxLength * 0.9;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm text-fg-muted">
          {label}
        </label>
        {maxLength && (
          <span
            className={cn("text-xs tabular-nums", isNearLimit ? "text-warning" : "text-fg-subtle")}
          >
            {value.length} / {maxLength}
          </span>
        )}
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "mt-1.5 block min-h-28 w-full resize-y rounded-control border bg-black px-3.5 py-3 text-base text-fg outline-none placeholder:text-fg-subtle sm:text-sm",
          error
            ? "border-danger/70 focus:border-danger"
            : "border-line focus:border-neon focus:shadow-glow-sm"
        )}
        {...textareaProps}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
