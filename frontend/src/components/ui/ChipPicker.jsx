"use client";

/**
 * Multi-select chips (genres, vibes) with a maximum. Each chip is a toggle
 * button with aria-pressed; at the limit, unselected chips are disabled.
 */
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import TaxonomyIcon from "@/components/ui/TaxonomyIcon";
import { cn } from "@/utils/genericFunctions";
import { tapPress } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {Array<{ slug: string, name: string, icon?: string, colour?: string }>} props.options
 * @param {string[]} props.value - Selected slugs
 * @param {(slugs: string[]) => void} props.onChange
 * @param {number} [props.max]
 * @param {string} [props.error]
 * @param {boolean} [props.loading=false] - Show placeholder chips
 * @param {string} [props.className]
 */
export default function ChipPicker({
  label,
  options,
  value,
  onChange,
  max,
  error,
  loading = false,
  className,
}) {
  const isFull = max !== undefined && value.length >= max;

  const toggle = (slug) => {
    onChange(value.includes(slug) ? value.filter((item) => item !== slug) : [...value, slug]);
  };

  return (
    <fieldset className={className}>
      <legend className="flex w-full items-center justify-between text-sm text-fg-muted">
        <span>{label}</span>
        {max !== undefined && (
          <span className="text-xs text-fg-subtle">
            {value.length} / {max}
          </span>
        )}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {loading
          ? Array.from({ length: 8 }, (_, index) => (
              <span
                key={index}
                className="h-11 w-24 animate-pulse rounded-full bg-surface-raised motion-reduce:animate-none"
              />
            ))
          : options.map((option) => {
              const isSelected = value.includes(option.slug);
              return (
                <motion.button
                  key={option.slug}
                  type="button"
                  whileTap={tapPress}
                  aria-pressed={isSelected}
                  disabled={!isSelected && isFull}
                  onClick={() => toggle(option.slug)}
                  style={{ "--chip": option.colour ?? "var(--color-neon)" }}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm transition",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected
                      ? "border-neon bg-neon-dim text-fg shadow-glow-sm"
                      : "border-line bg-black text-fg-muted hover:border-line-strong hover:text-fg"
                  )}
                >
                  {isSelected ? (
                    <Check size={14} className="text-neon" aria-hidden />
                  ) : (
                    option.icon && (
                      <TaxonomyIcon
                        name={option.icon}
                        size={14}
                        className="text-(--chip)"
                        aria-hidden
                      />
                    )
                  )}
                  {option.name}
                </motion.button>
              );
            })}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
