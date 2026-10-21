"use client";

/**
 * Staggered entrance for lists and grids.
 * Wrap the list in <Stagger> and each item in <StaggerItem>.
 */
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/utils/animations";

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {number} [props.stagger=0.06] - Delay between children, in seconds
 * @param {boolean} [props.inView=true] - Animate on scroll into view (false = on mount)
 */
export function Stagger({ children, className, stagger = 0.06, inView = true }) {
  const trigger = inView
    ? { whileInView: "visible", viewport: { once: true, margin: "-60px" } }
    : { animate: "visible" };

  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger)}
      initial="hidden"
      {...trigger}
    >
      {children}
    </motion.div>
  );
}

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export function StaggerItem({ children, className }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
