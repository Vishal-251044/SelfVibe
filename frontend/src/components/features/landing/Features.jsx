/**
 * Landing features grid: the six core SelfVibe capabilities from the PRD.
 */
import { AudioLines, Mic, Search, Smartphone, Upload, Wand2 } from "lucide-react";
import GridBackground from "@/components/ui/GridBackground";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import SectionHeading from "@/components/features/landing/SectionHeading";

const FEATURES = [
  {
    title: "A feed that learns you",
    desc: "Every play, skip and like tunes your For You feed, so it gets more personal every day.",
    icon: AudioLines,
  },
  {
    title: "Plays in the background",
    desc: "Install it like an app. Music keeps going with the screen locked, with lock-screen and earbud controls.",
    icon: Smartphone,
  },
  {
    title: "Voice control",
    desc: 'Say "next song", "hold" or "play Tum Hi Ho", in English or Hindi.',
    icon: Mic,
  },
  {
    title: "AI music studio",
    desc: "Type a prompt, pick a vibe and a tempo, and get an original track you can save or publish.",
    icon: Wand2,
  },
  {
    title: "Built for creators",
    desc: "Upload your tracks, set up your artist page, and see who is listening.",
    icon: Upload,
  },
  {
    title: "Search that forgives typos",
    desc: "Find any track, artist, playlist or genre in a couple of keystrokes.",
    icon: Search,
  },
];

export default function Features() {
  return (
    <section id="features" className="relative isolate scroll-mt-20 py-20 sm:py-28">
      <GridBackground intensity={0.12} glow={false} />

      <div className="px-safe mx-auto max-w-7xl md:px-6">
        <SectionHeading
          eyebrow="features"
          title="Built for the"
          highlight="modern listener"
          description="Listen, discover and create in one place, on your phone and on your desktop."
        />

        <Stagger className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {FEATURES.map(({ title, desc, icon: Icon }, index) => (
            <StaggerItem key={title}>
              <article className="group relative h-full rounded-card border border-line bg-surface/80 p-6 transition duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-glow-lg sm:p-8">
                <span className="absolute top-6 right-6 text-xs text-fg-subtle sm:text-sm">
                  [{String(index + 1).padStart(2, "0")}]
                </span>
                <div className="mb-6 flex size-12 items-center justify-center rounded-xl border border-line-strong bg-neon-dim text-neon transition group-hover:shadow-glow-sm">
                  <Icon size={22} aria-hidden />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold sm:text-xl">{title}</h3>
                <p className="text-sm leading-relaxed text-fg-muted">{desc}</p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
