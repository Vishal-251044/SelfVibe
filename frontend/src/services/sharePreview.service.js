/**
 * Server-side data for share links (PRD §10.8, roadmap Day 10): the title,
 * description and cover of a song, public playlist or artist, used by
 * generateMetadata and the Open Graph images. Runs on the Next.js server only
 * (link-preview bots have no session), straight against the API, cached for
 * five minutes. Anything missing or private returns null, so the page falls
 * back to the generic SelfVibe preview.
 */
const API_TARGET = (process.env.API_PROXY_TARGET ?? "").replace(/\/$/, "");
const REVALIDATE_SECONDS = 300;
const TIMEOUT_MS = 4000;

/**
 * GET one public API resource.
 * @param {string} path - e.g. "/tracks/123"
 * @returns {Promise<Object|null>} The response `data`, or null on any failure
 */
async function fetchPublic(path) {
  if (!API_TARGET) return null;
  try {
    const response = await fetch(`${API_TARGET}/api${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * An image URL the OG renderer can draw: absolute, and JPEG for Cloudinary
 * (the renderer can't decode WebP). Local-dev files get the API origin.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function toPreviewImageUrl(url) {
  if (!url) return null;
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    return url.replace("/image/upload/", "/image/upload/f_jpg,w_600,h_600,c_fill/");
  }
  if (/\.webp($|\?)/i.test(url)) return null;
  if (url.startsWith("/")) return API_TARGET ? `${API_TARGET}${url}` : null;
  return url;
}

/**
 * @param {"track"|"playlist"|"artist"} type
 * @param {string} key - Track / playlist id, or artist id / slug
 * @returns {Promise<{ type: string, title: string, subtitle: string, description: string, imageUrl: string|null }|null>}
 */
export async function getSharePreview(type, key) {
  const safeKey = encodeURIComponent(String(key));
  if (type === "track") {
    const data = await fetchPublic(`/tracks/${safeKey}`);
    const track = data?.track;
    if (!track) return null;
    const artist = track.artist?.stageName ?? "SelfVibe";
    return {
      type,
      title: track.title,
      subtitle: artist,
      description: `Listen to ${track.title} by ${artist} on SelfVibe.`,
      imageUrl: track.coverUrl ?? null,
    };
  }
  if (type === "playlist") {
    const data = await fetchPublic(`/playlists/${safeKey}`);
    const playlist = data?.playlist;
    if (!playlist) return null;
    const count = playlist.trackCount ?? playlist.tracks?.length ?? 0;
    return {
      type,
      title: playlist.name,
      subtitle: `Playlist by ${playlist.owner?.name ?? "SelfVibe"} · ${count} song${count === 1 ? "" : "s"}`,
      description: playlist.description || `A playlist on SelfVibe with ${count} songs.`,
      imageUrl: playlist.coverUrl ?? playlist.covers?.[0] ?? null,
    };
  }
  const data = await fetchPublic(`/artists/${safeKey}`);
  const artist = data?.artist;
  if (!artist) return null;
  return {
    type,
    title: artist.stageName,
    subtitle: artist.verified ? "Verified artist" : "Artist",
    description: artist.bio || `Listen to ${artist.stageName} on SelfVibe.`,
    imageUrl: artist.avatar ?? null,
  };
}
