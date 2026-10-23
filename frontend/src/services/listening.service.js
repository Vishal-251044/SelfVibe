/**
 * Listening API calls (roadmap Day 5): batched listening events, history and
 * signed stream URLs for the player queue.
 */
import { api } from "@/services/api";
import { getAdminPreviewStream } from "@/services/adminMusic.service";

/**
 * Send a batch of listening events.
 * @param {Object[]} events - { sessionId, trackId, kind, repeat?, msListened?, percent?, source?, device?, hour?, at }
 * @param {{ keepalive?: boolean }} [options] - keepalive while the page is being hidden
 * @returns {Promise<{ accepted: number, plays: number }>}
 */
export function sendListenEvents(events, { keepalive = false } = {}) {
  return api.post("/events", { events }, { keepalive });
}

/**
 * The signed-in user's last plays, newest first.
 * @param {{ limit?: number }} [query]
 * @param {Object} [options]
 * @returns {Promise<{ items: Array<{ playedAt: string, track: Object }> }>}
 */
export function getHistory(query = {}, options) {
  return api.get("/history", { ...options, query });
}

/**
 * Signed stream URLs for several tracks (the upcoming queue).
 * Staff previews (Admin Console) use the staff endpoint one track at a time.
 * @param {string[]} trackIds
 * @param {"user"|"staff"} [scope="user"]
 * @returns {Promise<Object<string, { url: string, expiresAt: string, bitrateKbps: number, durationSec: number }>>}
 */
export async function getStreamUrls(trackIds, scope = "user") {
  if (scope === "staff") {
    const entries = await Promise.all(
      trackIds.map((id) =>
        getAdminPreviewStream(id)
          .then((stream) => [id, stream])
          .catch(() => null)
      )
    );
    return Object.fromEntries(entries.filter(Boolean));
  }
  const { streams } = await api.post("/tracks/streams", { trackIds });
  return streams;
}
