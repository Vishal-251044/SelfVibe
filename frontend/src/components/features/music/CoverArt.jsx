"use client";

/**
 * Square cover art. Falls back to a generated neon gradient with a disc icon
 * when a track has no artwork (or the image fails to load).
 * Covers are already resized to WebP by the API, so next/image skips its own
 * optimiser (`unoptimized`) and works with any storage / CDN host.
 */
import { useState } from "react";
import Image from "next/image";
import { Disc3 } from "lucide-react";
import { cn } from "@/utils/genericFunctions";

/**
 * Pick a stable hue from a string, so the same track always gets the same fallback.
 * @param {string} seed
 * @returns {number} 0–359
 */
function hueFromSeed(seed = "") {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

/**
 * @param {Object} props
 * @param {string|null} props.src
 * @param {string} props.alt - e.g. "Midnight Chai cover"
 * @param {string} [props.seed] - Used for the fallback colour (defaults to alt)
 * @param {string} [props.sizes="64px"] - next/image sizes
 * @param {boolean} [props.priority=false]
 * @param {string} [props.className] - Size and radius, e.g. "size-12 rounded-lg"
 */
export default function CoverArt({ src, alt, seed, sizes = "64px", priority = false, className }) {
  const [hasFailed, setHasFailed] = useState(false);
  const hue = hueFromSeed(seed ?? alt);

  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-surface-raised", className)}>
      {src && !hasFailed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized
          onError={() => setHasFailed(true)}
          className="object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex size-full items-center justify-center"
          style={{
            background: `radial-gradient(circle at 30% 20%, hsl(${hue} 80% 45% / 0.55), transparent 60%), linear-gradient(135deg, hsl(${(hue + 140) % 360} 70% 18%), #050806)`,
          }}
        >
          <Disc3 className="size-2/5 text-white/70" strokeWidth={1.5} aria-hidden />
        </div>
      )}
    </div>
  );
}
