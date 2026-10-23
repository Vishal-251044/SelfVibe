/**
 * ccMixter provider for the royalty-free catalog import (roadmap Day 4).
 * Uses the public query API (no key). Only "Attribution" (CC BY) uploads are
 * requested, so tracks can be streamed in a commercial app with credit.
 * Docs: https://ccmixter.org/query-api
 */
import { USER_AGENT, fetchJson, vibesFromTags } from "./catalogSources.js";

const API_URL = "https://ccmixter.org/api/query";
const PAGE_SIZE = 20; // larger pages are slow on ccMixter and often time out
const MAX_DURATION_SEC = 10 * 60;

/**
 * Parse ccMixter's "m:ss" / "h:mm:ss" play time.
 * @param {string|undefined} playTime
 * @returns {number|null} seconds
 */
function parsePlayTime(playTime) {
  if (!playTime) return null;
  return String(playTime)
    .split(":")
    .reduce((total, part) => total * 60 + Number(part), 0);
}

/**
 * Convert one ccMixter upload into a catalog item (or null when unusable).
 * @param {Object} upload - Raw API row
 * @param {{ genre: string, vibes: string[] }} source
 * @returns {Object|null}
 */
function toCatalogItem(upload, source) {
  const mp3 = upload.files?.find((file) => /\.mp3$/i.test(file.download_url ?? ""));
  if (!mp3) return null;
  const durationSec = parsePlayTime(mp3.file_format_info?.ps);
  if (durationSec !== null && (durationSec < 30 || durationSec > MAX_DURATION_SEC)) return null;
  // Belt and braces: the query asks for CC BY, but never import anything else
  if (!/creativecommons\.org\/licenses\/by\//.test(upload.license_url ?? "")) return null;

  const tags = String(upload.upload_tags ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const artistName = (upload.user_real_name || upload.user_name || "").trim();
  const title = String(upload.upload_name ?? "").trim();
  if (!artistName || !title) return null;

  return {
    provider: "ccmixter",
    externalId: String(upload.upload_id),
    title: title.slice(0, 150),
    artistName: artistName.slice(0, 60),
    artistUrl: upload.artist_page_url ?? null,
    audioUrl: mp3.download_url,
    coverUrl: null, // ccMixter has no artwork; embedded art (if any) is used during processing
    pageUrl: upload.file_page_url ?? null,
    license: {
      name: `CC ${upload.license_name ?? "Attribution"}`,
      url: upload.license_url,
      attribution: `"${title}" by ${artistName} (ccmixter.org), licensed under CC ${upload.license_name ?? "BY"}`,
    },
    genres: [source.genre],
    vibes: [...new Set([...source.vibes, ...vibesFromTags(tags)])].slice(0, 5),
    bpm: Number(/bpm_(\d{2,3})/.exec(tags.join(","))?.[1]) || null,
  };
}

export const ccmixterProvider = {
  name: "ccmixter",

  /** ccMixter needs no API key. */
  isAvailable() {
    return true;
  },

  /**
   * Fetch up to `limit` usable items for one catalog source.
   * @param {{ genre: string, vibes: string[], ccmixterTags: string }} source
   * @param {number} limit
   * @returns {Promise<Object[]>}
   */
  async fetchItems(source, limit) {
    const items = [];
    for (let offset = 0; items.length < limit && offset < limit * 4; offset += PAGE_SIZE) {
      const url = `${API_URL}?f=json&lic=by&sort=rank&limit=${PAGE_SIZE}&offset=${offset}&tags=${encodeURIComponent(source.ccmixterTags)}`;
      const uploads = await fetchJson(url, { "User-Agent": USER_AGENT });
      if (!Array.isArray(uploads) || uploads.length === 0) break;
      for (const upload of uploads) {
        const item = toCatalogItem(upload, source);
        if (item) items.push(item);
        if (items.length >= limit) break;
      }
    }
    return items;
  },
};
