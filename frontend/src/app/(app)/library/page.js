/**
 * Library (/library): playlists, liked songs, recently played and following.
 * Data is connected on Day 6.
 */
import { Heart, History, ListMusic, Library, UserCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import FadeIn from "@/components/animations/FadeIn";

export const metadata = { title: "Your Library" };

const SHELVES = [
  { label: "Playlists", icon: ListMusic },
  { label: "Liked Songs", icon: Heart },
  { label: "Recently played", icon: History },
  { label: "Following", icon: UserCheck },
];

export default function LibraryPage() {
  return (
    <>
      <PageHeader
        eyebrow="selfvibe library --list"
        title="Your Library"
        subtitle="Everything you save, like and follow, in one place."
      />

      <FadeIn className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SHELVES.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface px-4"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neon-dim text-neon">
              <Icon size={18} aria-hidden />
            </span>
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </FadeIn>

      <FadeIn delay={0.08}>
        <EmptyState
          icon={Library}
          command="selfvibe library --list"
          title="nothing saved yet"
          description="Like a song, create a playlist or follow an artist, and it will show up here."
          action={<Button href="/search">Find something to save</Button>}
        />
      </FadeIn>
    </>
  );
}
