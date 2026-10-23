/**
 * Reporting content to the moderation team (PRD F32) — /api/reports.
 */
import { api } from "@/services/api";

/**
 * Report a track or artist.
 * @param {{ targetType: "track"|"artist", targetId: string, reason: string, details?: string }} input
 * @returns {Promise<{ reportId: string }>}
 */
export function fileReport(input) {
  return api.post("/reports", input);
}
