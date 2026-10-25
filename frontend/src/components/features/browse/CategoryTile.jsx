"use client";

/**
 * Genre / vibe tile (PRD BRW-1/2): the category's colour and icon (set by
 * staff in Admin → Genres & Vibes) over a faded cover from its top song.
 */
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import TaxonomyIcon from "@/components/ui/TaxonomyIcon";
import { hoverLift } from "@/utils/animations";
import { pluralize } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {"genre"|"vibe"} props.kind
 * @param {{ slug: string, name: string, icon: string, colour: string, description?: string, trackCount?: number, coverUrl?: string|null }} props.item
 */
export default function CategoryTile({ kind, item }) {
  return (
    <motion.div whileHover={hoverLift} className="h-full">
      <Link
        href={`/browse/${kind}/${item.slug}`}
        className="group relative flex aspect-[16/10] h-full flex-col justify-between overflow-hidden rounded-card border border-line p-3 transition duration-300 hover:border-line-strong active:scale-[0.98] sm:p-3.5 lg:aspect-[2/1]"
        style={{
          backgroundImage: `linear-gradient(150deg, ${item.colour}40, #050806 70%)`,
          boxShadow: `inset 0 0 0 1px ${item.colour}1a`,
        }}
      >
        {item.coverUrl && (
          <Image
            src={item.coverUrl}
            alt=""
            width={160}
            height={160}
            unoptimized
            className="absolute -right-3 -bottom-3 size-16 rotate-12 rounded-lg object-cover opacity-50 shadow-panel transition duration-300 group-hover:rotate-6 group-hover:opacity-80 lg:size-20"
          />
        )}
        <span
          className="relative flex size-8 items-center justify-center rounded-lg bg-black/40 backdrop-blur"
          style={{ color: item.colour }}
        >
          <TaxonomyIcon name={item.icon} size={16} aria-hidden />
        </span>
        <span className="relative min-w-0">
          <span className="block truncate font-display text-base font-bold tracking-tight text-fg sm:text-lg">
            {item.name}
          </span>
          <span className="block truncate text-xs text-fg-muted">
            {typeof item.trackCount === "number"
              ? pluralize(item.trackCount, "song")
              : item.description}
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
