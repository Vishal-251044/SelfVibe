/**
 * Horizontally scrollable row of vibe chips (swipe-friendly on phones,
 * wraps on wider screens). Each chip links to search filtered by that vibe.
 */
import Link from "next/link";
import { VIBES } from "@/utils/constants";

export default function VibeChips() {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      {VIBES.map(({ name, slug, icon: Icon }) => (
        <Link
          key={slug}
          href={`/search?vibe=${slug}`}
          className="inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-fg-muted transition hover:border-neon hover:text-neon hover:shadow-glow-sm"
        >
          <Icon size={16} className="text-neon" aria-hidden />
          {name}
        </Link>
      ))}
    </div>
  );
}
