"use client";

/**
 * Share button for a song, playlist or artist (PRD §10.8, roadmap Day 10):
 * opens the phone's share sheet, or copies the link on desktop. The link
 * opens a public page with a rich preview (Open Graph image).
 */
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useShare } from "@/hooks/useShare";
import { tapPress } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {"track"|"playlist"|"artist"} props.type
 * @param {string} props.id
 * @param {string|null} [props.slug] - Artists: prettier link
 * @param {string} props.title - e.g. song title
 * @param {string} [props.text] - Share sheet message
 * @param {"icon"|"button"} [props.variant="icon"]
 * @param {number} [props.size=20] - Icon size
 */
export default function ShareButton({ type, id, slug, title, text, variant = "icon", size = 20 }) {
  const share = useShare();
  const onClick = (event) => {
    event.stopPropagation();
    share({ type, id, slug, title, text });
  };

  if (variant === "button") {
    return (
      <Button variant="ghost" onClick={onClick} aria-label={`Share ${title}`}>
        <Share2 size={16} aria-hidden /> Share
      </Button>
    );
  }
  return (
    <motion.button
      type="button"
      whileTap={tapPress}
      onClick={onClick}
      aria-label={`Share ${title}`}
      className="flex size-11 items-center justify-center rounded-full text-fg-subtle transition hover:bg-neon-dim hover:text-neon"
    >
      <Share2 size={size} />
    </motion.button>
  );
}
