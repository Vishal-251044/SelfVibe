/**
 * Track a CSS media query, e.g. useMediaQuery("(min-width: 640px)").
 */
import { useSyncExternalStore } from "react";

/**
 * @param {string} query - CSS media query
 * @param {boolean} [serverValue=false] - Value used during server rendering
 * @returns {boolean} Whether the query currently matches
 */
export function useMediaQuery(query, serverValue = false) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}
