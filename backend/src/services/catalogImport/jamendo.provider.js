/**
 * Jamendo provider for the royalty-free catalog import (roadmap Day 4).
 * Needs a free API client id (JAMENDO_CLIENT_ID). Only tracks whose licence
 * allows commercial use (CC BY / CC BY-SA) and downloads are imported.
 * Docs: https://developer.jamendo.com/v3.0/tracks
 */
import { env } from "../../config/env.js";
import { USER_AGENT, fetchJson } from "./catalogSources.js";

const API_URL = "https://api.jamendo.com/v3.0/tracks/";
const PAGE_SIZE = 50;
const COMMERCIAL_LICENSE = /creativecommons\.org\/licenses\/by(-sa)?\//;

/**
 * Convert one Jamendo track into a catalog item (or null when unusable).
 * @param {Object} track - Raw API row
 * @param {{ genre: string, vibes: string[] }} source
 * @returns {Object|null}
 */
function toCatalogItem(track, source) {
  if (!track.audiodownload_allowed || !track.audiodownload) return null;
  if (!COMMERCIAL_LICENSE.test(track.license_ccurl ?? "")) return null;
  if (track.duration < 30 || track.duration > 10 * 60) return null;

  const licenseName = /by-sa/.test(track.license_ccurl) ? "CC BY-SA" : "CC BY";
  return {
    provider: "jamendo",
    externalId: String(track.id),
    title: String(track.name).trim().slice(0, 150),
    artistName: String(track.artist_name).trim().slice(0, 60),
    artistUrl: null,
    audioUrl: track.audiodownload,
    coverUrl: track.image || track.album_image || null,
    pageUrl: track.shareurl ?? null,
    license: {
      name: licenseName,
      url: track.license_ccurl,
      attribution: `"${track.name}" by ${track.artist_name} (jamendo.com), licensed under ${licenseName}`,
    },
    genres: [source.genre],
    vibes: source.vibes,
    bpm: null,
  };
}

export const jamendoProvider = {
  name: "jamendo",

  /** Only usable when JAMENDO_CLIENT_ID is set. */
  isAvailable() {
    return Boolean(env.catalog.jamendoClientId);
  },

  /**
   * Fetch up to `limit` usable items for one catalog source.
   * @param {{ genre: string, vibes: string[], jamendoTags: string }} source
   * @param {number} limit
   * @returns {Promise<Object[]>}
   */
  async fetchItems(source, limit) {
    const items = [];
    for (let offset = 0; items.length < limit && offset < limit * 4; offset += PAGE_SIZE) {
      const params = new URLSearchParams({
        client_id: env.catalog.jamendoClientId,
        format: "json",
        limit: String(PAGE_SIZE),
        offset: String(offset),
        tags: source.jamendoTags,
        order: "popularity_total",
        audiodlformat: "mp32",
        include: "licenses",
      });
      const response = await fetchJson(`${API_URL}?${params}`, { "User-Agent": USER_AGENT });
      if (response?.headers?.status !== "success") {
        throw new Error(`Jamendo API error: ${response?.headers?.error_message || "unknown"}`);
      }
      if (!response.results?.length) break;
      for (const track of response.results) {
        const item = toCatalogItem(track, source);
        if (item) items.push(item);
        if (items.length >= limit) break;
      }
    }
    return items;
  },
};
