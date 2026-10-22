"use client";

/**
 * Button with SelfVibe variants. Renders a Next.js <Link> when `href` is given
 * (a plain <a> with `nativeLink`, for full page loads such as OAuth redirects),
 * otherwise a <button>. All sizes meet the 44px minimum touch target.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/genericFunctions";
import { tapPress } from "@/utils/animations";

const VARIANTS = {
  primary: "bg-neon text-black font-semibold shadow-glow-sm hover:bg-neon-hover hover:shadow-glow",
  outline:
    "border border-line-strong text-neon-soft hover:border-neon hover:bg-neon-dim hover:shadow-glow-sm",
  ghost: "text-fg-muted hover:text-neon hover:bg-neon-dim",
};

const SIZES = {
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-7 text-base",
};

const MotionLink = motion.create(Link);

/**
 * @param {Object} props
 * @param {"primary"|"outline"|"ghost"} [props.variant="primary"]
 * @param {"md"|"lg"} [props.size="md"]
 * @param {string} [props.href] - Render as a link to this path
 * @param {boolean} [props.nativeLink=false] - Use a plain <a> (full navigation, no prefetch)
 * @param {boolean} [props.loading=false] - Show a spinner and disable the button
 * @param {boolean} [props.fullWidth=false]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export default function Button({
  variant = "primary",
  size = "md",
  href,
  nativeLink = false,
  loading = false,
  fullWidth = false,
  className,
  children,
  ...rest
}) {
  const classes = cn(
    "rounded-control inline-flex items-center justify-center gap-2 font-mono transition-[background-color,border-color,box-shadow,color] duration-200",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className
  );

  if (href && nativeLink) {
    return (
      <motion.a href={href} className={classes} whileTap={tapPress} {...rest}>
        {children}
      </motion.a>
    );
  }

  if (href) {
    return (
      <MotionLink href={href} className={classes} whileTap={tapPress} {...rest}>
        {children}
      </MotionLink>
    );
  }

  return (
    <motion.button
      type="button"
      className={classes}
      whileTap={tapPress}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
}
