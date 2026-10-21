/**
 * Home (/home): the listener's personalised For You feed.
 * Feed sections (Jump back in, Made for You, Trending…) arrive on Days 7–8.
 */
import { Compass } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import FadeIn from "@/components/animations/FadeIn";
import VibeChips from "@/components/features/browse/VibeChips";

export const metadata = { title: "Home" };

export default function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow="selfvibe feed --for-you"
        title="For You"
        subtitle="Music picked for your taste, mood and time of day."
      />

      <FadeIn as="section" className="mb-10" delay={0.05}>
        <h2 className="mb-4 text-sm text-fg-muted">What&apos;s the vibe right now?</h2>
        <VibeChips />
      </FadeIn>

      <FadeIn delay={0.1}>
        <EmptyState
          icon={Compass}
          command="selfvibe feed --build"
          title="your feed is warming up"
          description="Pick a few genres and vibes you love, and your For You feed will fill up with music made for you."
          action={<Button href="/search">Explore music</Button>}
        />
      </FadeIn>
    </>
  );
}
