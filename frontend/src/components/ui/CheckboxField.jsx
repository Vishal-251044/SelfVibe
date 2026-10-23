"use client";

/**
 * Checkbox with a label and optional description (e.g. the rights
 * confirmation on uploads). The whole row is the 44px+ touch target.
 */
import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} [props.description]
 * @param {string} [props.error]
 * @param {string} [props.className]
 */
export default function CheckboxField({ checked, onChange, label, description, error, className }) {
  const id = useId();
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-11 cursor-pointer items-start gap-3 rounded-control border p-3.5 transition",
          checked
            ? "border-line-strong bg-neon-dim"
            : "border-line bg-black hover:border-line-strong",
          error && "border-danger/70"
        )}
      >
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition peer-focus-visible:shadow-glow",
            checked ? "border-neon bg-neon text-black" : "border-line-strong"
          )}
        >
          {checked && <Check size={14} strokeWidth={3} />}
        </span>
        <span className="min-w-0 text-sm">
          <span className="text-fg">{label}</span>
          {description && <span className="mt-1 block text-xs text-fg-muted">{description}</span>}
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
