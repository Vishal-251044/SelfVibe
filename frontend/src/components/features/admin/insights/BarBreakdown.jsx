"use client";

/**
 * Horizontal bars for a breakdown (where plays come from, devices…),
 * biggest first, with counts and shares. Bars grow in with a transform.
 */
import { motion } from "framer-motion";
import { DURATION, EASE_OUT } from "@/utils/animations";

const LABELS = {
  feed: "For You feed",
  search: "Search",
  voice: "Voice",
  playlist: "Playlists",
  artist: "Artist pages",
  album: "Albums",
  history: "Jump back in",
  queue: "Queue",
  browse: "Browse",
  studio: "Studio",
  share: "Shared links",
  other: "Other",
  mobile: "Phone",
  tablet: "Tablet",
  desktop: "Desktop",
  unknown: "Unknown",
};

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {Object<string, number>} props.data
 * @param {string} [props.emptyText="No data yet"]
 */
export default function BarBreakdown({ title, data, emptyText = "No data yet" }) {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold text-neon-soft">{title}</h3>
      {total === 0 ? (
        <p className="font-mono text-xs text-fg-subtle">
          {">>"} {emptyText}
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map(([key, count]) => (
            <li key={key}>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span className="truncate text-fg-muted">{LABELS[key] ?? key}</span>
                <span className="shrink-0 font-mono text-fg">
                  {count.toLocaleString("en-IN")}{" "}
                  <span className="text-fg-subtle">· {Math.round((count / total) * 100)}%</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full origin-left rounded-full bg-neon"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: count / total }}
                  transition={{ duration: DURATION.slow, ease: EASE_OUT }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
