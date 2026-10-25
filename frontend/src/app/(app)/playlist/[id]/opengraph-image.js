/**
 * Open Graph image for a shared playlist link (roadmap Day 10).
 */
import { getSharePreview } from "@/services/sharePreview.service";
import { OG_CONTENT_TYPE, OG_SIZE, renderShareImage } from "@/lib/og/shareImage";
import { APP_TAGLINE } from "@/utils/constants";

export const alt = "Playlist on SelfVibe";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 300;

export default async function Image({ params }) {
  const { id } = await params;
  const preview = await getSharePreview("playlist", decodeURIComponent(id));
  return renderShareImage(preview ?? { type: "site", title: "SelfVibe", subtitle: APP_TAGLINE });
}
