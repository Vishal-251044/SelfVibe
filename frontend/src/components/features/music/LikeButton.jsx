"use client";

/**
 * Heart button (PRD LIB-1): like / unlike a song from anywhere. Pops when
 * liked; guests are sent to log in.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useTrackLike } from "@/hooks/useLibrary";
import { cn } from "@/utils/genericFunctions";
import { tapPress } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {{ id: string, title: string }} props.track
 * @param {number} [props.size=18]
 * @param {string} [props.className]
 */
export default function LikeButton({ track, size = 18, className }) {
  const { isLiked, toggle } = useTrackLike(track.id);

  return (
    <motion.button
      type="button"
      whileTap={tapPress}
      onClick={(event) => {
        event.stopPropagation();
        toggle();
      }}
      aria-label={isLiked ? `Remove ${track.title} from Liked Songs` : `Like ${track.title}`}
      aria-pressed={isLiked}
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
        isLiked ? "text-neon" : "text-fg-subtle hover:text-fg",
        className
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={isLiked ? "on" : "off"}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            transition: { type: "spring", stiffness: 500, damping: 18 },
          }}
          exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.1 } }}
          className="flex"
        >
          <Heart size={size} fill={isLiked ? "currentColor" : "none"} aria-hidden />
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
