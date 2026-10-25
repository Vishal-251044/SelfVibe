/**
 * Page title block: terminal-style eyebrow, title, optional subtitle and
 * actions. Title and actions share one row on every screen (Day 10 UI pass:
 * less empty space); the subtitle shows from `sm` up.
 */
import FadeIn from "@/components/animations/FadeIn";

/**
 * @param {Object} props
 * @param {string} props.eyebrow - Shown as `$ <eyebrow>`
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.actions] - Controls on the right of the title
 */
export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <FadeIn className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 sm:mb-6">
      <div className="min-w-0">
        <p className="mb-1 font-mono text-[11px] tracking-[0.18em] text-neon uppercase">
          $ {eyebrow}
        </p>
        <h1 className="font-display text-[clamp(1.5rem,3.2vw,2rem)] leading-tight font-bold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 hidden max-w-2xl text-sm text-fg-muted sm:block">{subtitle}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </FadeIn>
  );
}
