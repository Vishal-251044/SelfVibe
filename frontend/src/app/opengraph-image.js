/**
 * Default Open Graph image for the site (landing page and any page without its own).
 */
import { OG_CONTENT_TYPE, OG_SIZE, renderShareImage } from "@/lib/og/shareImage";
import { APP_DESCRIPTION, APP_NAME } from "@/utils/constants";

export const alt = `${APP_NAME} music streaming`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderShareImage({
    type: "site",
    title: "Feel the magic.",
    subtitle: APP_DESCRIPTION.split(":")[0],
  });
}
