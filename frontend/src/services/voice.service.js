/**
 * Voice command log (PRD VOC-6/7): text only — never audio.
 */
import { api } from "@/services/api";

/**
 * @param {{ transcript: string, language: "en-IN"|"hi-IN", intent: string, outcome: string, confidence?: number|null, latencyMs?: number|null }} entry
 * @returns {Promise<{ id: string }>}
 */
export function logVoiceCommand(entry) {
  return api.post("/voice/log", entry);
}
