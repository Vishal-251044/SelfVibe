"use client";

/**
 * Date range switch for stats pages: 7 days · 30 days · 90 days · All time.
 */
import { cn } from "@/utils/genericFunctions";

export const STATS_RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 0, label: "All time" },
];

/**
 * @param {Object} props
 * @param {number} props.value
 * @param {(range: number) => void} props.onChange
 * @param {string} [props.className]
 */
export default function RangeTabs({ value, onChange, className }) {
  return (
    <div
      role="radiogroup"
      aria-label="Date range"
      className={cn("inline-flex rounded-full border border-line bg-surface p-1", className)}
    >
      {STATS_RANGES.map((range) => (
        <button
          key={range.value}
          type="button"
          role="radio"
          aria-checked={value === range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "min-h-10 rounded-full px-3 text-xs font-medium whitespace-nowrap transition sm:px-4 sm:text-sm",
            value === range.value ? "bg-neon text-black" : "text-fg-muted hover:text-fg"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
