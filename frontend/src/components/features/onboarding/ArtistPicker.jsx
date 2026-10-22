"use client";

/**
 * Optional quiz step: pick artists you like. Shows a friendly empty state
 * while the catalog has no artists yet.
 */
import { motion } from "framer-motion";
import { BadgeCheck, Check, Mic2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { cn } from "@/utils/genericFunctions";
import { tapPress } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {{ id: string, stageName: string, avatar: string|null, verified: boolean }[]} props.artists
 * @param {Set<string>} props.selected - Selected artist ids
 * @param {(id: string) => void} props.onToggle
 */
export default function ArtistPicker({ artists, selected, onToggle }) {
  if (artists.length === 0) {
    return (
      <EmptyState
        icon={Mic2}
        command="selfvibe artists --list"
        title="artists are on their way"
        description="The catalog is just getting started. You can follow artists later from their pages — finish now and your feed will use your genres and vibes."
      />
    );
  }

  return (
    <Stagger
      className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6"
      stagger={0.03}
      inView={false}
    >
      {artists.map((artist) => {
        const isSelected = selected.has(artist.id);
        return (
          <StaggerItem key={artist.id}>
            <motion.button
              type="button"
              onClick={() => onToggle(artist.id)}
              aria-pressed={isSelected}
              whileTap={tapPress}
              className="flex w-full flex-col items-center gap-2 rounded-card p-2 text-center"
            >
              <span className="relative">
                <Avatar
                  name={artist.stageName}
                  src={artist.avatar}
                  size="lg"
                  className={cn("transition", isSelected && "border-2 border-neon shadow-glow")}
                />
                {isSelected && (
                  <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-neon text-black">
                    <Check size={14} strokeWidth={3} aria-hidden />
                  </span>
                )}
              </span>
              <span className="flex max-w-full items-center gap-1 text-xs text-fg sm:text-sm">
                <span className="truncate">{artist.stageName}</span>
                {artist.verified && (
                  <BadgeCheck size={14} className="shrink-0 text-neon" aria-label="Verified" />
                )}
              </span>
            </motion.button>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
