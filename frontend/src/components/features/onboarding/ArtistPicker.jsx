"use client";

/**
 * Quiz step 3 (optional): artists that match the genres and vibes picked in
 * steps 1–2. Indian artists are shown first ("From India"), then "Around the
 * world". Photos are freely licensed (Wikimedia Commons) and credited.
 */
import { motion } from "framer-motion";
import { BadgeCheck, Check, Globe, MapPin, Mic2, RotateCw } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { cn } from "@/utils/genericFunctions";
import { tapPress } from "@/utils/animations";

/**
 * One tappable artist: photo, name, best-matching genre.
 * @param {Object} props
 * @param {Object} props.artist
 * @param {boolean} props.selected
 * @param {() => void} props.onToggle
 * @param {Map<string, string>} props.genreNames - slug → display name
 * @param {string[]} props.pickedGenres
 */
function ArtistCard({ artist, selected, onToggle, genreNames, pickedGenres }) {
  // Show the genre that made this artist relevant, else their main genre
  const genreSlug = artist.genres.find((slug) => pickedGenres.includes(slug)) ?? artist.genres[0];

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      whileTap={tapPress}
      className="flex w-full flex-col items-center gap-2 rounded-card p-2 text-center"
    >
      <span className="relative">
        <Avatar
          name={artist.stageName}
          src={artist.avatar}
          size="xl"
          className={cn("transition", selected && "border-2 border-neon shadow-glow")}
        />
        {selected && (
          <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-neon text-black">
            <Check size={16} strokeWidth={3} aria-hidden />
          </span>
        )}
      </span>
      <span className="flex max-w-full items-center gap-1 text-sm font-semibold text-fg">
        <span className="truncate">{artist.stageName}</span>
        {artist.verified && (
          <BadgeCheck size={14} className="shrink-0 text-neon" aria-label="Verified" />
        )}
      </span>
      {genreSlug && (
        <span className="-mt-1 truncate text-xs text-fg-subtle">{genreNames.get(genreSlug)}</span>
      )}
    </motion.button>
  );
}

/**
 * A titled group of artist cards.
 * @param {Object} props
 * @param {string} props.title
 * @param {React.ComponentType} props.icon
 * @param {Object[]} props.artists
 */
function ArtistGroup({ title, icon: Icon, artists, ...cardProps }) {
  if (artists.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        <Icon size={18} className="text-neon" aria-hidden />
        {title}
      </h2>
      <Stagger
        className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 lg:grid-cols-6"
        stagger={0.025}
        inView={false}
      >
        {artists.map((artist) => (
          <StaggerItem key={artist.id}>
            <ArtistCard
              artist={artist}
              selected={cardProps.selected.has(artist.id)}
              onToggle={() => cardProps.onToggle(artist.id)}
              genreNames={cardProps.genreNames}
              pickedGenres={cardProps.pickedGenres}
            />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/**
 * @param {Object} props
 * @param {{ india: Object[], world: Object[] } | undefined} props.suggestions
 * @param {boolean} props.isLoading
 * @param {boolean} props.isError
 * @param {() => void} props.onRetry
 * @param {Set<string>} props.selected - Selected artist ids
 * @param {(id: string) => void} props.onToggle
 * @param {Object[]} props.genres - All genres (for names)
 * @param {string[]} props.pickedGenres - Genre slugs picked in step 1
 */
export default function ArtistPicker({
  suggestions,
  isLoading,
  isError,
  onRetry,
  selected,
  onToggle,
  genres,
  pickedGenres,
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6" aria-busy="true">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <Skeleton className="size-24 rounded-full sm:size-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={Mic2}
        command="selfvibe artists --suggest"
        title="couldn't load artists"
        description="You can finish without picking artists, or try again."
        action={
          <Button variant="outline" onClick={onRetry}>
            <RotateCw size={16} aria-hidden />
            Try again
          </Button>
        }
      />
    );
  }

  const india = suggestions?.india ?? [];
  const world = suggestions?.world ?? [];
  if (india.length === 0 && world.length === 0) {
    return (
      <EmptyState
        icon={Mic2}
        command="selfvibe artists --list"
        title="artists are on their way"
        description="The catalog is just getting started. Finish now — your feed will use your genres and vibes."
      />
    );
  }

  const cardProps = {
    selected,
    onToggle,
    pickedGenres,
    genreNames: new Map(genres.map((genre) => [genre.slug, genre.name])),
  };
  const hasCreditedPhotos = [...india, ...world].some((artist) => artist.avatarCreditUrl);

  return (
    <div>
      <ArtistGroup title="From India" icon={MapPin} artists={india} {...cardProps} />
      <ArtistGroup title="Around the world" icon={Globe} artists={world} {...cardProps} />
      {hasCreditedPhotos && (
        <p className="text-xs text-fg-subtle">
          Artist photos from{" "}
          <a
            href="https://commons.wikimedia.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center underline hover:text-neon"
          >
            Wikimedia Commons
          </a>
          , under their free licences.
        </p>
      )}
    </div>
  );
}
