/**
 * Daily Mix artwork: a 2×2 mosaic of song covers with the mix number and its
 * genre / vibe badge on top.
 */
import CoverArt from "@/components/features/music/CoverArt";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {{ index: number, tag: { name: string }, coverUrls: string[], tracks: Object[] }} props.mix
 * @param {string} [props.className]
 */
export default function MixCover({ mix, className }) {
  const tiles = Array.from({ length: 4 }, (_, position) => mix.coverUrls[position] ?? null);
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-lg", className)}>
      <div className="grid size-full grid-cols-2 grid-rows-2">
        {tiles.map((src, position) => (
          <CoverArt
            key={position}
            src={src}
            alt=""
            seed={`${mix.tag.name}-${position}`}
            className="size-full"
            sizes="(min-width: 640px) 12rem, 25vw"
          />
        ))}
      </div>
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
      />
      <span className="absolute bottom-2 left-2 rounded-md bg-neon px-2 py-0.5 font-mono text-xs font-bold text-black">
        MIX {mix.index}
      </span>
      <span className="absolute right-2 bottom-2 max-w-[60%] truncate rounded-md bg-black/70 px-2 py-0.5 text-xs text-fg backdrop-blur">
        {mix.tag.name}
      </span>
    </div>
  );
}
