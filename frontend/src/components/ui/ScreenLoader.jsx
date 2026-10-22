/**
 * Full-area loading state in the terminal style (e.g. while a session is
 * being restored). Uses a pulsing equalizer instead of plain "Loading…" text.
 */
import { cn } from "@/utils/genericFunctions";

const BAR_DELAYS = ["0ms", "150ms", "300ms", "450ms"];

/**
 * @param {Object} props
 * @param {string} [props.label="loading"] - Shown as `>> <label>…`
 * @param {string} [props.className]
 */
export default function ScreenLoader({ label = "loading", className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex min-h-[50dvh] flex-col items-center justify-center gap-5", className)}
    >
      <div className="flex h-8 items-end gap-1" aria-hidden>
        {BAR_DELAYS.map((delay) => (
          <span
            key={delay}
            className="h-full w-1.5 origin-bottom animate-pulse rounded-sm bg-neon shadow-glow-sm"
            style={{ animationDelay: delay }}
          />
        ))}
      </div>
      <p className="text-sm text-fg-muted">
        <span className="text-neon">{">>"}</span> {label}
        <span className="animate-blink text-neon">_</span>
      </p>
    </div>
  );
}
