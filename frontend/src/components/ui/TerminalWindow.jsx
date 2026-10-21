/**
 * Terminal window frame (traffic-light dots + title bar) used for the
 * terminal-style panels that define the SelfVibe look.
 */
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string} [props.title="selfvibe@terminal:~"] - Text in the title bar
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function TerminalWindow({ title = "selfvibe@terminal:~", children, className }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-line-strong bg-black/90 shadow-glow-lg backdrop-blur",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="size-3 rounded-full bg-red-500/90" />
        <span className="size-3 rounded-full bg-yellow-400/90" />
        <span className="size-3 rounded-full bg-neon" />
        <span className="ml-3 truncate text-xs text-fg-subtle sm:text-sm">{title}</span>
      </div>
      <div className="p-4 text-left text-sm sm:p-6 sm:text-base">{children}</div>
    </div>
  );
}
