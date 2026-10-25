/**
 * SelfVibe logo: neon microphone badge + glowing wordmark.
 * The single source of the brand mark — use this everywhere instead of
 * re-building the logo inline.
 */
import Link from "next/link";
import { Mic } from "lucide-react";
import { cn } from "@/utils/genericFunctions";

const SIZES = {
  sm: { badge: "size-8 rounded-lg", icon: 16, text: "text-lg" },
  md: { badge: "size-9 rounded-xl", icon: 18, text: "text-xl" },
  lg: { badge: "size-14 rounded-2xl", icon: 28, text: "text-3xl" },
};

/**
 * @param {Object} props
 * @param {"sm"|"md"|"lg"} [props.size="md"]
 * @param {string} [props.href="/"] - Where the logo links to; pass null for no link
 * @param {boolean} [props.showWordmark=true] - Hide the text for icon-only use
 * @param {string} [props.className]
 */
export default function Logo({ size = "md", href = "/", showWordmark = true, className }) {
  const s = SIZES[size];

  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center border border-neon bg-black shadow-glow",
          s.badge
        )}
      >
        <Mic size={s.icon} strokeWidth={2.25} className="text-neon" aria-hidden />
      </span>
      {showWordmark && (
        <span
          className={cn(
            "text-glow-soft font-display font-bold tracking-wide text-neon-soft",
            s.text
          )}
        >
          SelfVibe
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    // min-h-11 keeps the tap target at 44px even when the badge is smaller
    <Link
      href={href}
      aria-label="SelfVibe home"
      className="inline-flex min-h-11 items-center rounded-xl"
    >
      {content}
    </Link>
  );
}
