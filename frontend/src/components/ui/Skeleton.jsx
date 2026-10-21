/**
 * Skeleton placeholder with a neon shimmer, used while data is loading.
 */
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string} [props.className] - Size and shape, e.g. "h-4 w-32 rounded"
 */
export default function Skeleton({ className }) {
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden rounded-md bg-surface-raised", className)}
    >
      <div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-neon/10 to-transparent" />
    </div>
  );
}
