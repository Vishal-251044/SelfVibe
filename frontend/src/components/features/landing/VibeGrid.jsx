/**
 * "Browse by vibe" grid on the landing page (vibes from PRD BRW-2).
 */
import GridBackground from "@/components/ui/GridBackground";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import SectionHeading from "@/components/features/landing/SectionHeading";
import { VIBES } from "@/utils/constants";

export default function VibeGrid() {
  return (
    <section id="vibes" className="relative isolate scroll-mt-20 py-20 sm:py-28">
      <GridBackground intensity={0.2} />

      <div className="px-safe mx-auto max-w-6xl md:px-6">
        <SectionHeading
          eyebrow="browse"
          title="Browse by"
          highlight="vibe"
          description="Pick a vibe and let the music match your moment."
        />

        <Stagger className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4" stagger={0.05}>
          {VIBES.map(({ name, icon: Icon, blurb }) => (
            <StaggerItem key={name}>
              <div className="group relative flex h-full flex-col items-center gap-3 rounded-card border border-line bg-surface/70 p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-neon hover:shadow-glow-lg sm:gap-4 sm:p-8">
                <div className="flex size-12 items-center justify-center rounded-xl border border-line-strong bg-neon-dim text-neon transition group-hover:scale-110">
                  <Icon size={22} aria-hidden />
                </div>
                <p className="font-display text-lg font-bold text-neon-bright sm:text-2xl">
                  {name}
                </p>
                <p className="text-xs text-fg-muted sm:text-sm">{blurb}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
