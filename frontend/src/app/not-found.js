/**
 * Global 404 page.
 */
import { FileQuestion } from "lucide-react";
import Logo from "@/components/ui/Logo";
import GridBackground from "@/components/ui/GridBackground";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="pt-safe pb-safe px-safe relative isolate flex min-h-dvh flex-col items-center justify-center gap-10 py-12">
      <GridBackground intensity={0.2} />
      <Logo size="lg" />
      <EmptyState
        icon={FileQuestion}
        title="This page skipped a beat"
        description="We couldn't find what you were looking for. It may have moved, or the link is wrong."
        action={<Button href="/">Back to SelfVibe</Button>}
        className="w-full max-w-lg bg-black/80"
      />
    </div>
  );
}
