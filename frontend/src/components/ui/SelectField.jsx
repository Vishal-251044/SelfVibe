/**
 * Labelled native <select> styled like TextField (native = best on phones).
 */
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {Array<{ value: string, label: string }>} props.options
 * @param {string} [props.placeholder] - Adds an empty first option
 * @param {string} [props.error]
 * @param {string} [props.className]
 * Any other props are passed to the <select>.
 */
export default function SelectField({
  label,
  options,
  placeholder,
  error,
  className,
  ...selectProps
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm text-fg-muted">
        {label}
      </label>
      <div className="relative mt-1.5">
        <select
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "min-h-12 w-full appearance-none rounded-control border bg-black py-2 pr-10 pl-3.5 text-base text-fg transition outline-none sm:text-sm",
            error
              ? "border-danger/70 focus:border-danger"
              : "border-line focus:border-neon focus:shadow-glow-sm"
          )}
          {...selectProps}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-fg-subtle"
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
