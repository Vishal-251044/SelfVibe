/**
 * Standard header for in-app pages: terminal prompt eyebrow, title, subtitle,
 * and an optional actions slot on the right.
 */
import FadeIn from "@/components/animations/FadeIn";

/**
 * @param {Object} props
 * @param {string} props.eyebrow - Short command shown as `$ <eyebrow>`
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.actions]
 */
export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <FadeIn className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="mb-2 text-xs tracking-widest text-neon uppercase sm:text-sm">$ {eyebrow}</p>
        <h1 className="font-display text-[clamp(1.75rem,5vw,2.75rem)] leading-tight font-bold">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm text-fg-muted sm:text-base">{subtitle}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </FadeIn>
  );
}
