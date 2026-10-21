/**
 * Layout for /login and /signup: logo bar, grid background and a centered card.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import GridBackground from "@/components/ui/GridBackground";
import FadeIn from "@/components/animations/FadeIn";

export default function AuthLayout({ children }) {
  return (
    <div className="pt-safe pb-safe relative isolate flex min-h-dvh flex-col overflow-hidden">
      <GridBackground intensity={0.28} />

      <header className="px-safe mx-auto flex h-(--top-nav-height) w-full max-w-7xl items-center justify-between md:px-6">
        <Logo />
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-fg-muted hover:text-neon"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to home
        </Link>
      </header>

      <main className="px-safe flex flex-1 items-center justify-center py-8 sm:py-12">
        <FadeIn className="w-full max-w-md rounded-card border border-line-strong bg-black/85 p-6 shadow-glow-lg backdrop-blur-xl sm:p-10">
          {children}
        </FadeIn>
      </main>
    </div>
  );
}
