/**
 * Maps icon names stored in the database (genres, vibes) to lucide icons.
 * Only icons listed here can be shown; unknown names fall back to a music note.
 * Keep in sync with backend/scripts/data/taxonomy.js (and the Day 7 admin picker).
 */
import {
  Clapperboard,
  CodeXml,
  Coffee,
  Drum,
  Dumbbell,
  Flame,
  Guitar,
  Headphones,
  Heart,
  MicVocal,
  Moon,
  Music2,
  PartyPopper,
  Piano,
  Plane,
  Radio,
  Smile,
  Sparkles,
  Sun,
  Target,
  Waves,
  Zap,
} from "lucide-react";

export const TAXONOMY_ICONS = {
  Clapperboard,
  CodeXml,
  Coffee,
  Drum,
  Dumbbell,
  Flame,
  Guitar,
  Headphones,
  Heart,
  MicVocal,
  Moon,
  Music2,
  PartyPopper,
  Piano,
  Plane,
  Radio,
  Smile,
  Sparkles,
  Sun,
  Target,
  Waves,
  Zap,
};

/**
 * Look up an icon component by its stored name.
 * @param {string} name - e.g. "Headphones"
 * @returns {import("lucide-react").LucideIcon}
 */
export function getTaxonomyIcon(name) {
  return TAXONOMY_ICONS[name] ?? Music2;
}
