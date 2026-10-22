/**
 * Renders a genre / vibe icon from its stored name (see utils/iconRegistry.js).
 */
import { createElement } from "react";
import { getTaxonomyIcon } from "@/utils/iconRegistry";

/**
 * @param {Object} props
 * @param {string} props.name - Icon name, e.g. "Headphones"
 * Any other props (size, className, aria-*) are passed to the lucide icon.
 */
export default function TaxonomyIcon({ name, ...iconProps }) {
  return createElement(getTaxonomyIcon(name), iconProps);
}
