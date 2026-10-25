"use client";

/**
 * All · Official · Community switch (PRD CAT-2, roadmap Day 7). The choice
 * is saved on the account, so Home, Search, Browse and vibe pages all
 * remember it. The active pill slides between options.
 */
import { useId } from "react";
import { motion } from "framer-motion";
import { useCatalogFilter } from "@/hooks/useCatalogFilter";
import { CATALOG_FILTERS } from "@/utils/musicConstants";
import { DURATION, EASE_OUT } from "@/utils/animations";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string} [props.className]
 */
export default function CatalogSwitch({ className }) {
  const { catalog, setCatalog } = useCatalogFilter();
  const pillId = useId();

  return (
    <div
      role="radiogroup"
      aria-label="Which music to show"
      className={cn("inline-flex rounded-full border border-line bg-surface p-1", className)}
    >
      {CATALOG_FILTERS.map((option) => {
        const isActive = option.value === catalog;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setCatalog(option.value)}
            className={cn(
              "relative min-h-10 rounded-full px-4 text-sm font-medium transition-colors",
              isActive ? "text-black" : "text-fg-muted hover:text-fg"
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`catalog-pill-${pillId}`}
                className="absolute inset-0 rounded-full bg-neon shadow-glow-sm"
                transition={{ duration: DURATION.base, ease: EASE_OUT }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
