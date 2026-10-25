"use client";

/**
 * One number on a console page (plays, listeners, DAU…), with an optional
 * hint underneath and an icon. Shows a shimmer while loading.
 */
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {React.ReactNode} props.value
 * @param {string} [props.hint] - e.g. "5 new today"
 * @param {React.ComponentType} [props.icon]
 * @param {"default"|"warning"|"danger"} [props.tone="default"]
 * @param {boolean} [props.loading=false]
 * @param {string} [props.className]
 */
export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading = false,
  className,
}) {
  return (
    <div className={cn("rounded-card border border-line bg-surface p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs tracking-wider text-fg-muted uppercase">{label}</p>
        {Icon && (
          <Icon
            size={16}
            className={cn(
              "shrink-0",
              tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-neon"
            )}
            aria-hidden
          />
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p
          className={cn(
            "mt-2 font-display text-[clamp(1.5rem,4vw,2rem)] leading-none font-bold",
            tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-fg"
          )}
        >
          {value}
        </p>
      )}
      {hint && !loading && <p className="mt-2 truncate text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
