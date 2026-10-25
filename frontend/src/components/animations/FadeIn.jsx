"use client";

/**
 * Reveal-on-scroll wrapper: fades and lifts its children into view once.
 */
import { motion } from "framer-motion";
import { fadeUp, riseIn } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {number} [props.delay=0] - Delay in seconds before the reveal
 * @param {string} [props.as="div"] - Element to render (div, section, li…)
 * @param {boolean} [props.riseOnly=false] - Lift without fading (above-the-fold main text, keeps LCP fast)
 */
export default function FadeIn({ children, className, delay = 0, as = "div", riseOnly = false }) {
  const Component = motion[as] ?? motion.div;

  return (
    <Component
      className={className}
      variants={riseOnly ? riseIn : fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay }}
    >
      {children}
    </Component>
  );
}
