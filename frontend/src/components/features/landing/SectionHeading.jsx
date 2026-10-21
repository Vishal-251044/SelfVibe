/**
 * Centered heading used by every landing section: prompt eyebrow, title with
 * a neon highlight word, and a supporting line.
 */
import FadeIn from "@/components/animations/FadeIn";

/**
 * @param {Object} props
 * @param {string} props.eyebrow - Shown as `// <eyebrow>`
 * @param {string} props.title - Plain part of the title
 * @param {string} [props.highlight] - Neon part of the title, after `title`
 * @param {string} [props.description]
 */
export default function SectionHeading({ eyebrow, title, highlight, description }) {
  return (
    <FadeIn className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
      <p className="mb-4 text-xs tracking-[0.3em] text-neon uppercase sm:text-sm">{`// ${eyebrow}`}</p>
      <h2 className="font-display text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] font-bold">
        {title} {highlight && <span className="text-glow text-neon-bright">{highlight}</span>}
      </h2>
      {description && (
        <p className="mx-auto mt-4 max-w-2xl text-sm text-fg-muted sm:text-base">{description}</p>
      )}
    </FadeIn>
  );
}
