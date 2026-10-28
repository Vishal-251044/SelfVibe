/**
 * Landing hero: status badge, headline, pitch, CTAs and the animated terminal.
 */
import { Play } from "lucide-react";
import GridBackground from "@/components/ui/GridBackground";
import Button from "@/components/ui/Button";
import FadeIn from "@/components/animations/FadeIn";
import HeroTerminal from "@/components/features/landing/HeroTerminal";
import HeroPrimaryAction from "@/components/features/landing/HeroPrimaryAction";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative isolate flex min-h-[calc(100dvh-var(--top-nav-height))] scroll-mt-24 items-center overflow-hidden py-16 sm:py-24"
    >
      <GridBackground intensity={0.35} />

      <div className="px-safe mx-auto w-full max-w-5xl text-center md:px-6">
        <FadeIn>
          <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-black/60 px-4 py-2 text-xs text-neon shadow-glow-sm sm:text-sm">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-neon" />
            </span>
            Now streaming worldwide
          </span>
        </FadeIn>

        <FadeIn riseOnly delay={0.08}>
          <h1 className="mt-8 font-display text-[clamp(2.75rem,11vw,5.5rem)] leading-[0.95] font-bold tracking-tight">
            <span className="block">Stream music.</span>
            <span className="text-glow block text-neon-bright">Feel the magic.</span>
          </h1>
        </FadeIn>

        <FadeIn riseOnly delay={0.16}>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-lg">
            Music that gets you. A feed that learns your taste, songs that keep playing when your
            phone locks, play anything with your voice, and a studio to make your own tracks.
          </p>
        </FadeIn>

        <FadeIn delay={0.24}>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <HeroPrimaryAction />
            <Button href="#features" size="lg" variant="outline">
              <Play size={16} aria-hidden />
              See how it works
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.32} className="mt-14 sm:mt-16">
          <HeroTerminal />
        </FadeIn>
      </div>
    </section>
  );
}
