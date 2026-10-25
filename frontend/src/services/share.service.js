/**
 * Share counting (roadmap Day 10): tells the API a song, playlist or artist
 * was shared, for the song performance stats (PRD PRF-1 "shares").
 */
import { api } from "@/services/api";

/**
 * @param {{ targetType: "track"|"playlist"|"artist", targetId: string, channel: "native"|"copy" }} share
 * @returns {Promise<void>}
 */
export function recordShare(share) {
  return api.post("/shares", share);
}
