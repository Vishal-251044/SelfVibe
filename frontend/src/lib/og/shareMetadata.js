/**
 * Page metadata for shared links (roadmap Day 10): title, description and the
 * Open Graph / Twitter card fields, built from the public API data. The image
 * itself comes from the page's opengraph-image.js route.
 */
import { getSharePreview } from "@/services/sharePreview.service";
import { APP_NAME } from "@/utils/constants";

const OG_TYPES = { track: "music.song", playlist: "music.playlist", artist: "profile" };

/**
 * @param {"track"|"playlist"|"artist"} type
 * @param {string} key - id or slug
 * @param {string} path - Canonical page path, e.g. "/track/123"
 * @param {string} fallbackTitle - Used when the item is missing or private
 * @returns {Promise<import("next").Metadata>}
 */
export async function buildShareMetadata(type, key, path, fallbackTitle) {
  const preview = await getSharePreview(type, key);
  if (!preview) return { title: fallbackTitle };
  const title = type === "track" ? `${preview.title} · ${preview.subtitle}` : preview.title;
  return {
    title,
    description: preview.description,
    alternates: { canonical: path },
    openGraph: {
      type: OG_TYPES[type],
      siteName: APP_NAME,
      title,
      description: preview.description,
      url: path,
    },
    twitter: { card: "summary_large_image", title, description: preview.description },
  };
}
