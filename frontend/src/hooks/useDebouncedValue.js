/**
 * Debounce a fast-changing value (e.g. a search box) before using it in a query.
 */
import { useEffect, useState } from "react";

/**
 * @template T
 * @param {T} value
 * @param {number} [delayMs=300]
 * @returns {T} The value, once it has stopped changing for `delayMs`
 */
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
