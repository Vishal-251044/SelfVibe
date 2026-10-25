"use client";

/**
 * Staff hero banners at the top of Home (roadmap Day 9 Curation): big image
 * with a title, subtitle and a button. Several banners scroll sideways
 * (swipe on phones, snap per banner).
 */
import Image from "next/image";
import Link from "next/link";
import EqualizerBars from "@/components/animations/EqualizerBars";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { DURATION, EASE_OUT } from "@/utils/animations";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {Array<{ id: string, title: string, subtitle: string, imageUrl: string|null, link: string|null }>} props.banners
 */
export default function HeroBanner({ banners }) {
  if (banners.length === 0) return null;
  const isSingle = banners.length === 1;

  return (
    <section aria-label="Featured" className="mb-6 sm:mb-8">
      <div
        className={cn(
          "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:mx-0 md:gap-4 md:px-0",
          isSingle && "overflow-hidden"
        )}
      >
        {banners.map((banner, index) => {
          const isExternal = banner.link?.startsWith("https://");
          const content = (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.slow, ease: EASE_OUT, delay: index * 0.06 }}
              className="group relative flex h-44 w-full items-end overflow-hidden rounded-card border border-line-strong bg-surface sm:h-52"
            >
              {banner.imageUrl ? (
                <Image
                  src={banner.imageUrl}
                  alt=""
                  fill
                  unoptimized
                  priority={index === 0}
                  sizes="(min-width: 1280px) 80rem, 100vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgb(34_197_94/0.45),transparent_55%),linear-gradient(140deg,#0b120d,#000)]"
                />
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"
              />
              {!banner.imageUrl && (
                <EqualizerBars className="absolute right-5 bottom-5 hidden h-24 w-48 opacity-60 sm:flex lg:right-8 lg:h-32 lg:w-72" />
              )}
              <div className="relative max-w-xl p-4 sm:p-6 lg:p-7">
                <p className="font-mono text-[11px] text-neon sm:text-xs">$ selfvibe featured</p>
                <h2 className="mt-1 font-display text-[clamp(1.375rem,3.6vw,2.25rem)] leading-tight font-bold tracking-tight">
                  {banner.title}
                </h2>
                {banner.subtitle && (
                  <p className="mt-1 line-clamp-2 text-[13px] text-fg-muted sm:text-sm">
                    {banner.subtitle}
                  </p>
                )}
                {banner.link && (
                  <span className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-neon px-4 text-[13px] font-semibold text-black transition group-hover:shadow-glow sm:mt-4">
                    Listen now <ArrowRight size={16} aria-hidden />
                  </span>
                )}
              </div>
            </motion.div>
          );
          const className = cn(
            "block shrink-0 snap-start",
            isSingle ? "w-full" : "w-[88%] md:w-[80%]"
          );
          if (!banner.link)
            return (
              <div key={banner.id} className={className}>
                {content}
              </div>
            );
          return isExternal ? (
            <a
              key={banner.id}
              href={banner.link}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {content}
            </a>
          ) : (
            <Link key={banner.id} href={banner.link} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
