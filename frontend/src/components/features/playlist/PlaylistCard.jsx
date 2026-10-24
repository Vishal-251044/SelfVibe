"use client";

/**
 * Playlist tile for the Library grid: artwork, name, song count, privacy.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Globe, Lock } from "lucide-react";
import PlaylistCover from "@/components/features/playlist/PlaylistCover";
import { hoverLift } from "@/utils/animations";
import { pluralize } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {Object} props.playlist - Playlist summary from the API
 */
export default function PlaylistCard({ playlist }) {
  const PrivacyIcon = playlist.isPublic ? Globe : Lock;
  return (
    <motion.div whileHover={hoverLift} className="h-full">
      <Link
        href={`/playlist/${playlist.id}`}
        className="block h-full rounded-card border border-line bg-surface p-3 transition hover:border-line-strong hover:shadow-glow-sm"
      >
        <PlaylistCover
          playlist={playlist}
          className="w-full rounded-lg"
          sizes="(min-width: 1024px) 15vw, (min-width: 640px) 28vw, 44vw"
        />
        <p className="mt-3 truncate text-sm font-semibold text-fg">{playlist.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
          <PrivacyIcon size={12} aria-label={playlist.isPublic ? "Public" : "Private"} />
          {pluralize(playlist.trackCount, "song")}
        </p>
      </Link>
    </motion.div>
  );
}
