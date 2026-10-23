/**
 * Small status pill (track status, processing state, roles).
 */
import { cn } from "@/utils/genericFunctions";

const TONES = {
  success: "border-neon/40 bg-neon-dim text-neon-soft",
  info: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
  muted: "border-line bg-surface-raised text-fg-muted",
};

/**
 * @param {Object} props
 * @param {"success"|"info"|"warning"|"danger"|"muted"} [props.tone="muted"]
 * @param {boolean} [props.pulse=false] - Animated dot for "in progress" states
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export default function Badge({ tone = "muted", pulse = false, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {pulse && (
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
