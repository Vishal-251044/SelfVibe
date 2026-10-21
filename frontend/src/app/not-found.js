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
        command="selfvibe open ./this-page"
        title="404: page not found"
        description="The page you are looking for does not exist or has moved."
        action={<Button href="/">Back to home</Button>}
        className="w-full max-w-lg bg-black/80"
      />
    </div>
  );
}
