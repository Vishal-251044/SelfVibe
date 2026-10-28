/**
 * Shared layout for the Privacy Policy and Terms pages (roadmap Day 10
 * launch): site navbar, a readable column of sections, site footer.
 */
import SiteNavbar from "@/components/layout/SiteNavbar";
import SiteFooter from "@/components/layout/SiteFooter";
import FadeIn from "@/components/animations/FadeIn";

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.updated - "Last updated" date
 * @param {Array<{ heading: string, body: string[] }>} props.sections
 */
export default function LegalPage({ title, updated, sections }) {
  return (
    <>
      <SiteNavbar />
      <main
        id="main"
        tabIndex={-1}
        className="px-safe mx-auto max-w-3xl py-12 outline-none md:px-6 md:py-20"
      >
        <FadeIn riseOnly>
          <h1 className="mt-3 font-display text-[clamp(2rem,6vw,3rem)] leading-tight font-bold">
            {title}
          </h1>
          <p className="mt-2 text-sm text-fg-subtle">Last updated {updated}</p>
        </FadeIn>
        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-semibold text-neon-soft">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-fg-muted">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
