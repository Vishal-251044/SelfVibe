/**
 * Open Graph images in the SelfVibe theme (PRD §10.8 "rich previews",
 * roadmap Day 10 share links): 1200×630, black background, neon green, the
 * cover on the left and a terminal-style "$ selfvibe play" title on the right.
 * Used by every opengraph-image.js route (song, playlist, artist, site).
 */
import { ImageResponse } from "next/og";
import { toPreviewImageUrl } from "@/services/sharePreview.service";
import { APP_NAME, APP_TAGLINE } from "@/utils/constants";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const NEON = "#22c55e";
const NEON_BRIGHT = "#6bff6b";
const COMMANDS = { track: "play", playlist: "playlist --open", artist: "artist --follow" };

/**
 * Keep long titles inside the card.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function clip(text, max) {
  const value = String(text ?? "");
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

/**
 * Square cover, or a neon placeholder when there is no usable image.
 * @param {{ src: string|null, isRound: boolean }} props
 */
function Cover({ src, isRound }) {
  const style = {
    width: 400,
    height: 400,
    borderRadius: isRound ? 200 : 28,
    border: `3px solid ${NEON}`,
    boxShadow: "0 0 80px rgba(34,197,94,0.45)",
  };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img>
      <img src={src} alt="" width={400} height={400} style={{ ...style, objectFit: "cover" }} />
    );
  }
  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #052e16 0%, #000 60%, #14532d 100%)",
        color: NEON_BRIGHT,
        fontSize: 120,
        fontWeight: 700,
      }}
    >
      SV
    </div>
  );
}

/**
 * Use the cover only if it really loads as PNG / JPEG — a broken cover link
 * must not break the whole preview.
 * @param {string|null} url
 * @returns {Promise<string|null>}
 */
async function usableImage(url) {
  if (!url) return null;
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    const type = response.headers.get("content-type") ?? "";
    return response.ok && /image\/(png|jpe?g)/.test(type) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Render a share image.
 * @param {{ type?: "track"|"playlist"|"artist"|"site", title: string, subtitle?: string, imageUrl?: string|null }} preview
 * @returns {Promise<ImageResponse>}
 */
export async function renderShareImage({ type = "site", title, subtitle = "", imageUrl = null }) {
  const isSite = type === "site";
  const command = COMMANDS[type] ?? "start";
  const coverSrc = isSite ? null : await usableImage(toPreviewImageUrl(imageUrl));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 64,
        padding: "0 80px",
        background:
          "radial-gradient(circle at 20% 30%, rgba(34,197,94,0.28), transparent 55%), #000",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      {!isSite && <Cover src={coverSrc} isRound={type === "artist"} />}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", color: NEON, fontSize: 30, fontFamily: "monospace" }}>
          {`$ selfvibe ${command}`}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: isSite ? 92 : title.length > 28 ? 60 : 76,
            fontWeight: 700,
            lineHeight: 1.05,
            color: isSite ? NEON_BRIGHT : "#fff",
          }}
        >
          {clip(title, 60)}
        </div>
        {subtitle && (
          <div style={{ display: "flex", marginTop: 20, fontSize: 34, color: "#9ca3af" }}>
            {clip(subtitle, 70)}
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 56,
            fontSize: 28,
            color: "#bbf7d0",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 14,
              height: 14,
              borderRadius: 7,
              background: NEON,
              boxShadow: `0 0 16px ${NEON}`,
            }}
          />
          {`${APP_NAME} · ${APP_TAGLINE}`}
        </div>
      </div>
    </div>,
    OG_SIZE
  );
}
