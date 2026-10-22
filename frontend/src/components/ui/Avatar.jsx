/**
 * Round avatar: the user's photo, or their initials on a neon-tinted circle.
 */
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

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-neon-dim font-display font-bold text-neon-soft",
        box,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name ? `${name}'s avatar` : "Avatar"}
          width={px}
          height={px}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden>{getInitials(name)}</span>
      )}
    </span>
  );
}
