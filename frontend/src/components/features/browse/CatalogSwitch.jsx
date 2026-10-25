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
      className={cn(
        // 44px tall for touch; the visible track (::before) is slimmer
        "relative inline-flex rounded-full px-0.5 before:pointer-events-none before:absolute before:inset-x-0 before:inset-y-1 before:rounded-full before:border before:border-white/10 before:bg-surface-raised before:content-['']",
        className
      )}
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
              "relative min-h-11 rounded-full px-3.5 text-[13px] font-medium transition-colors",
              isActive ? "text-black" : "text-fg-muted hover:text-fg"
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`catalog-pill-${pillId}`}
                className="absolute inset-x-0 inset-y-1.5 rounded-full bg-neon shadow-glow-sm"
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
