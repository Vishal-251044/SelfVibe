/**
 * Voice command log (PRD VOC-6/7, roadmap Day 7 "POST /voice/log"):
 * text only — the transcript the browser recognised plus what the parser made
 * of it. No audio ever reaches the server. Rows expire after 30 days (TTL index).
 */
import { VoiceLog } from "../models/voiceLog.model.js";
import { logger } from "../utils/logger.js";

/**
 * Save one voice command.
 * @param {string|null} userId - Signed-in user, or null
 * @param {{ transcript: string, language: string, intent: string, outcome: string, confidence?: number|null, latencyMs?: number|null }} entry
 * @returns {Promise<{ id: string }>}
 */
export async function logVoiceCommand(userId, entry) {
  const log = await VoiceLog.create({ ...entry, userId: userId ?? null });
  logger.debug(
    `[VoiceService] command logged intent=${entry.intent} outcome=${entry.outcome} lang=${entry.language}`
  );
  return { id: String(log._id) };
}
