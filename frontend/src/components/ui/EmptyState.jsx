/**
 * Empty / error state: an icon, a short title, an optional explanation and
 * an optional button. Used when a list or screen has nothing to show yet, or
 * something couldn't load. Plain, friendly wording (no technical text).
 */
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {React.ComponentType} [props.icon] - Lucide icon component
 * @param {string} props.title - e.g. "No songs yet" (first letter is capitalised)
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action] - Optional button/link
 * @param {string} [props.className]
 */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-10 text-center sm:py-14",
        className
      )}
    >
      {Icon && (
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-line-strong bg-neon-dim text-neon">
          <Icon size={26} aria-hidden />
        </div>
      )}
      <p className="text-base font-semibold text-fg first-letter:uppercase sm:text-lg">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
