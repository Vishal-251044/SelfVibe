"use client";

/**
 * Animated equalizer bars (landing terminal, Home featured banner). Only
 * `transform` is animated, so it stays smooth on phones; Framer's
 * MotionConfig (reducedMotion="user") stills it for people who turn motion off.
 */
import { motion } from "framer-motion";
import { cn } from "@/utils/genericFunctions";

const DEFAULT_BARS = [0.45, 0.8, 0.6, 1, 0.7, 0.4, 0.85, 0.55, 0.95, 0.5, 0.75, 0.35, 0.9, 0.6];

/**
 * @param {Object} props
 * @param {number[]} [props.bars] - Peak height of each bar (0–1)
 * @param {string} [props.className] - Size of the bar area, e.g. "h-12"
 * @param {string} [props.barClassName] - Extra classes for each bar
 */
export default function EqualizerBars({ bars = DEFAULT_BARS, className, barClassName }) {
  return (
    <div className={cn("flex items-end gap-1", className)} aria-hidden>
      {bars.map((height, index) => (
        <motion.span
          key={index}
          className={cn(
            "h-full flex-1 origin-bottom rounded-sm bg-linear-to-t from-neon/40 to-neon-bright",
            barClassName
          )}
          initial={{ scaleY: 0.15 }}
          animate={{ scaleY: [0.15, height, 0.3, height * 0.7, 0.15] }}
          transition={{
            duration: 1.6 + (index % 4) * 0.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.05,
          }}
        />
      ))}
    </div>
  );
}
