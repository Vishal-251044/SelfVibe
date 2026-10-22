"use client";

/**
 * Toggle tile for the taste quiz (a genre or a vibe): icon in its category
 * colour, name, short description, and a check badge when selected.
 * Works as a checkbox for screen readers (aria-pressed).
 */
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import TaxonomyIcon from "@/components/ui/TaxonomyIcon";
import { cn } from "@/utils/genericFunctions";
import { DURATION, tapPress } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {{ name: string, icon: string, colour: string, description?: string }} props.option
 * @param {boolean} props.selected
 * @param {() => void} props.onToggle
 */
export default function SelectableTile({ option, selected, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      whileTap={tapPress}
      style={{ "--tile": option.colour }}
      className={cn(
        "relative flex h-full min-h-28 w-full flex-col items-start gap-3 rounded-card border p-4 text-left transition-[border-color,box-shadow,background-color] duration-200",
        selected
          ? "border-neon bg-neon-dim shadow-glow-sm"
          : "border-line bg-surface hover:border-line-strong hover:bg-surface-raised"
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--tile)_16%,transparent)] text-(--tile)">
        <TaxonomyIcon name={option.icon} size={20} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base font-bold text-fg">{option.name}</span>
        {option.description && (
          <span className="mt-0.5 line-clamp-2 block text-xs text-fg-muted">
            {option.description}
          </span>
        )}
      </span>

      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: DURATION.fast }}
            className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-neon text-black"
            aria-hidden
          >
            <Check size={14} strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
