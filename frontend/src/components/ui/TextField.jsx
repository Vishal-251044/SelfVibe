"use client";

/**
 * Labelled text input with an optional leading icon, inline error message,
 * and a show/hide toggle for password fields.
 */
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {React.ComponentType} [props.icon] - Lucide icon shown inside the field
 * @param {string} [props.error] - Error message; also marks the input invalid
 * @param {string} [props.type="text"]
 * @param {string} [props.className] - Classes for the outer wrapper
 * @param {string} [props.inputClassName] - Extra classes for the <input> (e.g. code fields)
 * Any other props are passed to the <input>.
 */
export default function TextField({
  label,
  icon: Icon,
  error,
  type = "text",
  className,
  inputClassName,
  ...inputProps
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm text-fg-muted">
        {label}
      </label>
      <div
        className={cn(
          "mt-1.5 flex min-h-12 items-center gap-3 rounded-control border bg-black px-3.5 transition",
          error
            ? "border-danger/70 focus-within:border-danger"
            : "border-line focus-within:border-neon focus-within:shadow-glow-sm"
        )}
      >
        {Icon && <Icon size={18} className="shrink-0 text-fg-subtle" aria-hidden />}
        <input
          id={id}
          type={isPassword && isPasswordVisible ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "min-h-11 w-full min-w-0 self-stretch bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle sm:text-sm",
            inputClassName
          )}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-fg-subtle hover:text-neon"
          >
            {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
