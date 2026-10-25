/**
 * Terminal-style empty state: a command line, a result line, and an optional
 * call to action. Used when a list or screen has nothing to show yet.
 */
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {React.ComponentType} [props.icon] - Lucide icon component
 * @param {string} props.command - Shown as `$ <command>`
 * @param {string} props.title - Result line, shown as `>> <title>`
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action] - Optional button/link
 * @param {string} [props.className]
 */
export default function EmptyState({ icon: Icon, command, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-12 text-center sm:py-16",
        className
      )}
    >
      {Icon && (
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-line-strong bg-neon-dim text-neon">
          <Icon size={26} aria-hidden />
        </div>
      )}
      <p className="font-mono text-sm text-neon">$ {command}</p>
      <p className="mt-2 text-base font-semibold text-fg sm:text-lg">
        <span className="text-neon">{">>"}</span> {title}
        <span className="ml-1 animate-blink text-neon">_</span>
      </p>
      {description && <p className="mt-3 max-w-md text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
