"use client";

/**
 * Public artist page (/artist/[id], PRD F23 / CRT-1): hero with photo, name,
 * genres and bio; popular tracks you can play; albums; report.
 * Works for guests (shared links) — they are asked to log in to listen.
 */
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Globe, Headphones, MapPin, Mic2, Play } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import FadeIn from "@/components/animations/FadeIn";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import TrackRow from "@/components/features/music/TrackRow";
import CoverArt from "@/components/features/music/CoverArt";
import ReportButton from "@/components/features/music/ReportButton";
import { getArtistPage } from "@/services/creator.service";
import { useAuthStore } from "@/store/authStore";
import { usePlayerStore } from "@/store/playerStore";
import { QUERY_KEYS } from "@/utils/constants";

/** Loading skeleton with the same layout as the page. */
function ArtistPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading artist">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
        <Skeleton className="size-36 rounded-full sm:size-44" />
        <div className="flex w-full flex-col items-center gap-3 sm:items-start">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="mt-10 space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-control" />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idOrSlug
 */
export default function ArtistPageView({ idOrSlug }) {
  const isSignedIn = useAuthStore((state) => state.status === "authenticated");
  const playQueue = usePlayerStore((state) => state.playQueue);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.artistPage(idOrSlug),
    queryFn: ({ signal }) => getArtistPage(idOrSlug, { signal }),
    retry: (count, queryError) => queryError?.status !== 404 && count < 2,
  });

  if (isPending) return <ArtistPageSkeleton />;
  if (isError) {
    const isMissing = error?.status === 404;
    return (
      <EmptyState
        icon={Mic2}
        command={`selfvibe artist --open ${idOrSlug}`}
        title={isMissing ? "artist not found" : "couldn't load this artist"}
        description={
          isMissing
            ? "This artist page doesn't exist or was removed."
            : (error?.message ?? "Check your connection and try again.")
        }
        action={
          isMissing ? (
            <Button href="/search">Search artists</Button>
          ) : (
            <Button onClick={() => refetch()}>Try again</Button>
          )
        }
      />
    );
  }

  const { artist, tracks, albums } = data;
  const website = artist.socials?.website;

  return (
    <>
      {/* Hero */}
      <FadeIn className="relative isolate overflow-hidden rounded-card border border-line bg-surface p-6 sm:p-8">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgb(34_197_94/0.22),transparent_60%)]"
        />
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
          <Avatar
            name={artist.stageName}
            src={artist.avatar}
            size="xl"
            className="size-36 shrink-0 shadow-glow-lg sm:size-44"
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center justify-center gap-2 text-xs tracking-widest text-neon uppercase sm:justify-start">
              {artist.verified ? (
                <>
                  <BadgeCheck size={16} aria-hidden /> Verified artist
                </>
              ) : (
                "Artist"
              )}
            </p>
            <h1 className="mt-2 font-display text-[clamp(2rem,7vw,3.75rem)] leading-none font-bold break-words">
              {artist.stageName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-fg-muted sm:justify-start">
              <span className="flex items-center gap-1.5">
                <Headphones size={15} aria-hidden /> {tracks.length}{" "}
                {tracks.length === 1 ? "track" : "tracks"}
              </span>
              {artist.country && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} aria-hidden /> {artist.country}
                </span>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex min-h-11 items-center gap-1.5 hover:text-neon"
                >
                  <Globe size={15} aria-hidden /> Website
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 sm:justify-start">
          {tracks.length > 0 &&
            (isSignedIn ? (
              <Button size="lg" onClick={() => playQueue(tracks, 0, { source: "artist" })}>
                <Play size={18} fill="currentColor" aria-hidden /> Play
              </Button>
            ) : (
              <Button size="lg" href={`/login?next=${encodeURIComponent(`/artist/${idOrSlug}`)}`}>
                Log in to listen
              </Button>
            ))}
          <ReportButton targetType="artist" targetId={artist.id} targetName={artist.stageName} />
        </div>

        {artist.genres.length > 0 && (
          <ul className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
            {artist.genres.map((genre) => (
              <li
                key={genre}
                className="rounded-full border border-line bg-black px-3 py-1 text-xs text-fg-muted"
              >
                {genre}
              </li>
            ))}
          </ul>
        )}
      </FadeIn>

      {/* Tracks */}
      <section className="mt-10" aria-labelledby="popular-heading">
        <h2 id="popular-heading" className="mb-4 font-display text-xl font-bold">
          Popular
        </h2>
        {tracks.length === 0 ? (
          <EmptyState
            icon={Headphones}
            command={`selfvibe tracks --artist ${artist.slug ?? artist.id}`}
            title="no tracks yet"
            description={`${artist.stageName} hasn't released any music on SelfVibe yet.`}
          />
        ) : (
          <Stagger className="space-y-1" stagger={0.04}>
            {tracks.map((track, index) => (
              <StaggerItem key={track.id}>
                <TrackRow
                  track={track}
                  index={index + 1}
                  showArtist={false}
                  showCatalog
                  tracks={tracks}
                  playable={isSignedIn}
                  showQueueMenu={isSignedIn}
                  source="artist"
                  actions={
                    <ReportButton targetType="track" targetId={track.id} targetName={track.title} />
                  }
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      {/* Albums */}
      {albums.length > 0 && (
        <section className="mt-10" aria-labelledby="albums-heading">
          <h2 id="albums-heading" className="mb-4 font-display text-xl font-bold">
            Albums &amp; EPs
          </h2>
          <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {albums.map((album) => (
              <StaggerItem key={album.id}>
                <div className="rounded-card border border-line bg-surface p-3 transition hover:-translate-y-1 hover:border-line-strong">
                  <CoverArt
                    src={album.coverUrl}
                    alt={`${album.title} cover`}
                    className="aspect-square w-full rounded-lg"
                    sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw"
                  />
                  <p className="mt-3 truncate text-sm font-medium">{album.title}</p>
                  <p className="text-xs text-fg-subtle uppercase">
                    {album.type} · {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      <ArtistAbout bio={artist.bio} />
    </>
  );
}

/**
 * About section (only when the artist has a bio).
 * @param {Object} props
 * @param {string} props.bio
 */
function ArtistAbout({ bio }) {
  if (!bio) return null;
  return (
    <section
      className="mt-10 rounded-card border border-line bg-surface p-5 sm:p-6"
      aria-labelledby="about-heading"
    >
      <h2 id="about-heading" className="mb-3 font-display text-xl font-bold">
        About
      </h2>
      <p className="text-sm whitespace-pre-line text-fg-muted">{bio}</p>
    </section>
  );
}
