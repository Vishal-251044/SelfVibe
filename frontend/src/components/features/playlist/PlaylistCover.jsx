"use client";

/**
 * Playlist artwork: the uploaded cover, else a 2×2 mosaic of song covers
 * (one cover fills the square), else a neon placeholder.
 */
import { ListMusic } from "lucide-react";
import CoverArt from "@/components/features/music/CoverArt";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {{ name: string, coverUrl?: string|null, covers?: string[] }} props.playlist
 * @param {string} [props.sizes="160px"]
 * @param {boolean} [props.priority=false]
 * @param {string} [props.className] - Size / radius, e.g. "size-40 rounded-card"
 */
export default function PlaylistCover({ playlist, sizes = "160px", priority = false, className }) {
  const covers = playlist.coverUrl ? [playlist.coverUrl] : (playlist.covers ?? []);
  const alt = `${playlist.name} cover`;

  if (covers.length === 0) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgb(34_197_94/0.35),transparent_60%),linear-gradient(135deg,#0b120d,#000)]",
          className
        )}
      >
        <ListMusic className="size-2/5 text-neon/80" strokeWidth={1.5} aria-hidden />
      </div>
    );
  }
  if (covers.length < 4) {
    return (
      <CoverArt
        src={covers[0]}
        alt={alt}
        sizes={sizes}
        priority={priority}
        className={cn("aspect-square", className)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("grid aspect-square grid-cols-2 overflow-hidden", className)}
    >
      {covers.slice(0, 4).map((cover, index) => (
        <CoverArt
          key={`${cover}-${index}`}
          src={cover}
          alt=""
          sizes={sizes}
          className="size-full"
        />
      ))}
    </div>
  );
}
