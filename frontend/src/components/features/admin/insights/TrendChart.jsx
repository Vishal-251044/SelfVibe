"use client";

/**
 * Day-by-day line + area chart drawn with plain SVG (no chart library).
 * Hover or tap anywhere on it to read a day's value. Scales to any width;
 * the line draws in once (skipped with reduced motion).
 */
import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatCount } from "@/utils/genericFunctions";

const WIDTH = 600;
const HEIGHT = 180;
const PAD_TOP = 12;

/**
 * "2026-10-30" → "30 Oct".
 * @param {string} date
 * @returns {string}
 */
function shortDate(date) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * @param {Object} props
 * @param {Array<Object>} props.series - [{ date, ...values }]
 * @param {string} props.valueKey - e.g. "plays"
 * @param {string} props.label - e.g. "Plays"
 * @param {string} [props.className]
 */
export default function TrendChart({ series, valueKey, label, className }) {
  const gradientId = useId();
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState(null);
  const values = series.map((point) => point[valueKey] ?? 0);
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);

  if (series.length === 0) return null;

  const x = (index) => (series.length === 1 ? WIDTH / 2 : (index / (series.length - 1)) * WIDTH);
  const y = (value) => PAD_TOP + (1 - value / max) * (HEIGHT - PAD_TOP);
  const line = values
    .map(
      (value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`
    )
    .join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)},${HEIGHT} L${x(0).toFixed(1)},${HEIGHT} Z`;

  /** Nearest day to the pointer. */
  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setActive(Math.round(ratio * (series.length - 1)));
  };
  const point = active === null ? null : series[active];

  return (
    <figure className={className}>
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-fg-muted">{label}</span>
        <span className="text-xs font-semibold text-fg-subtle tabular-nums">
          {point ? (
            <>
              <span className="text-neon">{(point[valueKey] ?? 0).toLocaleString("en-IN")}</span> on{" "}
              {shortDate(point.date)}
            </>
          ) : (
            <>
              <span className="text-neon">{total.toLocaleString("en-IN")}</span> total · peak{" "}
              {formatCount(max)}
            </>
          )}
        </span>
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full touch-pan-y overflow-visible"
          role="img"
          aria-label={`${label}: ${total} over ${series.length} days, peak ${max}`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={WIDTH}
              y1={PAD_TOP + ratio * (HEIGHT - PAD_TOP)}
              y2={PAD_TOP + ratio * (HEIGHT - PAD_TOP)}
              stroke="rgb(34 197 94 / 0.1)"
              strokeDasharray="4 6"
            />
          ))}
          <motion.path
            d={area}
            fill={`url(#${gradientId})`}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={prefersReducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          {point && (
            <>
              <line
                x1={x(active)}
                x2={x(active)}
                y1="0"
                y2={HEIGHT}
                stroke="rgb(34 197 94 / 0.4)"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={x(active)}
                cy={y(values[active])}
                r="5"
                fill="#22c55e"
                stroke="#000"
                strokeWidth="2"
              />
            </>
          )}
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[0.6875rem] font-semibold text-fg-subtle tabular-nums">
        <span>{shortDate(series[0].date)}</span>
        <span>{shortDate(series.at(-1).date)}</span>
      </div>
    </figure>
  );
}
