"use client";

/**
 * Round avatar: the user's photo, or their initials on a neon-tinted circle.
 * Falls back to the initials if the photo fails to load (offline, deleted,
 * expired Google photo URL), so broken-image text never shows.
 */
import { useState } from "react";
import Image from "next/image";
import { cn, getInitials } from "@/utils/genericFunctions";

const SIZES = {
  sm: { box: "size-9 text-xs", px: 36 },
  md: { box: "size-11 text-sm", px: 44 },
  lg: { box: "size-20 text-2xl", px: 80 },
};

/**
 * @param {Object} props
 * @param {string} [props.name] - Used for initials and alt text
 * @param {string|null} [props.src] - Photo URL
 * @param {"sm"|"md"|"lg"} [props.size="md"]
 * @param {string} [props.className]
 */
export default function Avatar({ name, src, size = "md", className }) {
  const { box, px } = SIZES[size];
  // Remember which URL failed, so a new photo gets a fresh chance to load
  const [failedSrc, setFailedSrc] = useState(null);
  const showPhoto = Boolean(src) && failedSrc !== src;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-neon-dim font-display font-bold text-neon-soft",
        box,
        className
      )}
    >
      {showPhoto ? (
        <Image
          src={src}
          alt={name ? `${name}'s avatar` : "Avatar"}
          width={px}
          height={px}
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-hidden>{getInitials(name)}</span>
      )}
    </span>
  );
}
