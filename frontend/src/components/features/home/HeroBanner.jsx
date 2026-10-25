"use client";

/**
 * Staff hero banners at the top of Home (roadmap Day 9 Curation): big image
 * with a title, subtitle and a button. Several banners scroll sideways
 * (swipe on phones, snap per banner).
 */
import Image from "next/image";
import Link from "next/link";
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
    <section aria-label="Featured" className="mb-8">
      <div
        className={cn(
          "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 md:mx-0 md:px-0",
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
              className="group relative flex aspect-[16/10] w-full items-end overflow-hidden rounded-card border border-line-strong bg-surface sm:aspect-[21/8]"
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
              <div className="relative max-w-xl p-5 sm:p-8">
                <p className="font-mono text-xs text-neon">$ selfvibe featured</p>
                <h2 className="mt-1 font-display text-[clamp(1.5rem,5vw,3rem)] leading-tight font-bold">
                  {banner.title}
                </h2>
                {banner.subtitle && (
                  <p className="mt-1 line-clamp-2 text-sm text-fg-muted sm:text-base">
                    {banner.subtitle}
                  </p>
                )}
                {banner.link && (
                  <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-neon px-5 text-sm font-semibold text-black transition group-hover:shadow-glow">
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
