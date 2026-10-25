"use client";

/**
 * Daily Mix 1–3 on Home (PRD 10.4.3, roadmap Day 9): one tile per mix with a
 * cover mosaic and its top artists; tap opens the mix, the round button plays
 * it straight away. Hidden until the listener has a taste profile.
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import FadeIn from "@/components/animations/FadeIn";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import MixCover from "@/components/features/home/MixCover";
import { getDailyMixes } from "@/services/feed.service";
import { usePlayerStore } from "@/store/playerStore";
import { useCatalogFilter } from "@/hooks/useCatalogFilter";
import { QUERY_KEYS } from "@/utils/constants";
import { hoverLift, tapPress } from "@/utils/animations";

export default function DailyMixRow() {
  const { catalog } = useCatalogFilter();
  const playQueue = usePlayerStore((state) => state.playQueue);
  const query = useQuery({
    queryKey: QUERY_KEYS.dailyMixes(catalog),
    queryFn: ({ signal }) => getDailyMixes({ catalog }, { signal }),
    staleTime: 30 * 60 * 1000,
  });
  const mixes = query.data?.mixes ?? [];
  if (query.isError || (!query.isPending && mixes.length === 0)) return null;

  return (
    <FadeIn className="mb-10">
      <section aria-label="Daily Mixes">
        <p className="font-mono text-xs text-neon">$ selfvibe mix --daily</p>
        <h2 className="mb-4 font-display text-xl font-bold sm:text-2xl">Your Daily Mixes</h2>
        {query.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="aspect-square w-full rounded-card" />
            ))}
          </div>
        ) : (
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" stagger={0.05}>
            {mixes.map((mix) => (
              <StaggerItem key={mix.index}>
                <motion.div whileHover={hoverLift} className="group relative">
                  <Link
                    href={`/mix/${mix.index}`}
                    className="block rounded-card border border-line bg-surface p-3 transition hover:border-line-strong hover:shadow-glow-sm"
                  >
                    <MixCover mix={mix} className="w-full" />
                    <p className="mt-3 truncate font-semibold">{mix.title}</p>
                    <p className="truncate text-xs text-fg-muted">{mix.subtitle}</p>
                  </Link>
                  <motion.button
                    type="button"
                    whileTap={tapPress}
                    onClick={() => playQueue(mix.tracks, 0, { source: "feed" })}
                    aria-label={`Play ${mix.title}`}
                    className="absolute top-5 right-5 flex size-11 items-center justify-center rounded-full bg-neon text-black shadow-panel transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                  >
                    <Play size={18} fill="currentColor" aria-hidden />
                  </motion.button>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </FadeIn>
  );
}
