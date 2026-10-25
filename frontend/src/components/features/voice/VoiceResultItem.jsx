"use client";

/**
 * One voice / search candidate as a tappable row: song, artist, playlist,
 * genre or vibe, with the right artwork and a type label.
 */
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import CoverArt from "@/components/features/music/CoverArt";
import PlaylistCover from "@/components/features/playlist/PlaylistCover";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import TaxonomyIcon from "@/components/ui/TaxonomyIcon";
import { CATALOG_META } from "@/utils/musicConstants";
import { tapPress } from "@/utils/animations";

const TYPE_LABEL = {
  track: "Song",
  artist: "Artist",
  playlist: "Playlist",
  genre: "Genre",
  vibe: "Vibe",
};

/**
 * @param {{ type: string, item: Object }} candidate
 * @returns {{ title: string, subtitle: string }}
 */
function describe({ type, item }) {
  if (type === "track") return { title: item.title, subtitle: item.artist?.stageName ?? "" };
  if (type === "artist")
    return { title: item.stageName, subtitle: item.isOfficial ? "Official artist" : "Creator" };
  if (type === "playlist") return { title: item.name, subtitle: `${item.trackCount} songs` };
  return { title: item.name, subtitle: item.description ?? "" };
}

/**
 * @param {Object} props
 * @param {{ type: string, item: Object }} props.candidate
 * @param {() => void} props.onSelect
 * @param {boolean} [props.isBusy=false]
 */
export default function VoiceResultItem({ candidate, onSelect, isBusy = false }) {
  const { type, item } = candidate;
  const { title, subtitle } = describe(candidate);
  const catalog = type === "track" ? CATALOG_META[item.catalog] : null;

  return (
    <motion.button
      type="button"
      whileTap={tapPress}
      onClick={onSelect}
      disabled={isBusy}
      className="group flex min-h-16 w-full items-center gap-3 rounded-control border border-transparent p-2 text-left transition hover:border-line hover:bg-surface-raised disabled:opacity-60"
    >
      {type === "track" && (
        <CoverArt
          src={item.coverUrl}
          alt=""
          seed={item.id}
          className="size-12 rounded-lg"
          sizes="48px"
        />
      )}
      {type === "artist" && (
        <Avatar name={item.stageName} src={item.avatar} size="md" className="size-12" />
      )}
      {type === "playlist" && (
        <PlaylistCover playlist={item} className="size-12 rounded-lg" sizes="48px" />
      )}
      {(type === "genre" || type === "vibe") && (
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${item.colour}26`, color: item.colour }}
        >
          <TaxonomyIcon name={item.icon} size={22} aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-fg">{title}</span>
        <span className="flex items-center gap-2 text-xs text-fg-muted">
          <span className="shrink-0 tracking-wider text-neon uppercase">{TYPE_LABEL[type]}</span>
          {subtitle && <span className="truncate">{subtitle}</span>}
        </span>
      </span>
      {catalog && (
        <Badge tone={catalog.tone} className="hidden shrink-0 sm:inline-flex">
          {catalog.label}
        </Badge>
      )}
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neon text-black opacity-90 transition group-hover:opacity-100">
        <Play size={16} fill="currentColor" aria-hidden />
      </span>
    </motion.button>
  );
}
