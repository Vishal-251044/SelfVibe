/**
 * VoiceLog: one spoken command as text only — never audio (PRD VOC-6,
 * roadmap Day 7 "POST /voice/log: text-only command log, TTL 30 days").
 * Used to improve the command parser; deleted automatically after 30 days.
 */
import mongoose from "mongoose";
import {
  VOICE_INTENTS,
  VOICE_LANGUAGES,
  VOICE_LOG_TTL_SECONDS,
  VOICE_OUTCOMES,
  VOICE_TRANSCRIPT_MAX,
} from "../config/constants.js";

const voiceLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    transcript: { type: String, required: true, trim: true, maxlength: VOICE_TRANSCRIPT_MAX },
    language: { type: String, enum: VOICE_LANGUAGES, required: true },
    intent: { type: String, enum: VOICE_INTENTS, required: true },
    outcome: { type: String, enum: VOICE_OUTCOMES, required: true },
    confidence: { type: Number, min: 0, max: 1, default: null }, // from the speech engine
    latencyMs: { type: Number, min: 0, default: null }, // speech end → feedback shown (VOC-5: < 1 s)
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

voiceLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: VOICE_LOG_TTL_SECONDS });
voiceLogSchema.index({ intent: 1, outcome: 1, createdAt: -1 });

export const VoiceLog = mongoose.model("VoiceLog", voiceLogSchema);
