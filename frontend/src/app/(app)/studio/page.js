/**
 * AI Studio (/studio): prompt-to-track music generation. Built on Days 11–12.
 */
import { Sparkles } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import FadeIn from "@/components/animations/FadeIn";

export const metadata = { title: "AI Studio" };

export default function StudioPage() {
  return (
    <>
      <PageHeader
        eyebrow="Create"
        title="AI Studio"
        subtitle="Describe a vibe, pick a tempo, and get an original track you can save or publish."
      />
      <FadeIn delay={0.05}>
        <EmptyState
          icon={Sparkles}
          title="studio is tuning up"
          description="AI music generation is not available on your account yet. Check back soon."
        />
      </FadeIn>
    </>
  );
}
