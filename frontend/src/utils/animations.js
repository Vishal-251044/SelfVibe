/**
 * Shared Framer Motion variants, durations and easings.
 * Components import from here instead of defining their own animation values,
 * so motion feels consistent across the app. Only transform and opacity are
 * animated to stay at 60fps on mobile.
 */

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
};

/** Expo-out curve: quick start, soft landing. */
export const EASE_OUT = [0.16, 1, 0.3, 1];

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT },
  },
};

/**
 * Lift only, no fade: for the largest text on a page (hero, page titles), so
 * it counts as painted at once (LCP) while still moving in (Day 10 Lighthouse pass).
 */
export const riseIn = {
  hidden: { y: 16 },
  visible: { y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.slow, ease: EASE_OUT } },
};

/**
 * Parent variant that staggers its children's entrance.
 * @param {number} [stagger=0.06] - Delay between each child, in seconds
 * @param {number} [delay=0] - Delay before the first child, in seconds
 * @returns {Object} Framer Motion variants
 */
export const staggerContainer = (stagger = 0.06, delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** Slide-down used by dropdowns and the mobile menu. */
export const slideDown = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast } },
};

/** Page entrance used by the app shell on route change. */
export const pageTransition = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

/** Hover / tap feedback for cards and buttons. */
export const hoverLift = { y: -4, transition: { duration: DURATION.fast } };
export const tapPress = { scale: 0.97 };

/** Backdrop behind sheets and dialogs. */
export const overlayFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/** Bottom sheet on phones: slides up from the bottom edge. */
export const sheetUp = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } },
  exit: { y: "100%", transition: { duration: DURATION.base, ease: EASE_OUT } },
};

/** Centred dialog on larger screens: fades and scales in. */
export const dialogPop = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DURATION.fast } },
};

/** Rows that enter and leave a list (uploads, results). */
export const listItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};
