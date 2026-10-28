"use client";

/**
 * Voice language (English / Hindi — Hinglish works in both) and the
 * "spoken replies" toggle (PRD VOC-2/5). Hidden where voice isn't supported.
 * Small phones get one compact button that flips the language, so the
 * search row fits on a 360px screen.
 */
import { Volume2, VolumeX } from "lucide-react";
import { useVoiceStore } from "@/store/voiceStore";
import { useSpeechSupport } from "@/hooks/useSpeechSupport";
import { VOICE_LANGUAGES } from "@/utils/musicConstants";
import { cn } from "@/utils/genericFunctions";
import { useAppSettings } from "@/hooks/useAppSettings";

/**
 * @param {Object} props
 * @param {string} [props.className]
 */
export default function VoiceSettings({ className }) {
  // Hidden where the browser can't listen, or while the Owner has voice switched off
  const canListen = useSpeechSupport();
  const { isFeatureOn } = useAppSettings();
  const isSupported = canListen && isFeatureOn("voice");
  const language = useVoiceStore((state) => state.language);
  const speakReplies = useVoiceStore((state) => state.speakReplies);
  const setLanguage = useVoiceStore((state) => state.setLanguage);
  const toggleSpeakReplies = useVoiceStore((state) => state.toggleSpeakReplies);

  if (!isSupported) return null;
  const SpeakIcon = speakReplies ? Volume2 : VolumeX;
  const current = VOICE_LANGUAGES.find((option) => option.value === language) ?? VOICE_LANGUAGES[0];
  const other = VOICE_LANGUAGES.find((option) => option.value !== current.value) ?? current;

  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2", className)}>
      <button
        type="button"
        onClick={() => setLanguage(other.value)}
        aria-label={`Voice language: ${current.label}. Switch to ${other.label}`}
        className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-surface-raised text-[11px] font-semibold text-neon tabular-nums transition active:scale-95 sm:hidden"
      >
        {current.short}
      </button>
      <div
        role="radiogroup"
        aria-label="Voice language"
        className="hidden rounded-full border border-white/10 bg-surface-raised p-0.5 sm:inline-flex"
      >
        {VOICE_LANGUAGES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={language === option.value}
            aria-label={`Voice: ${option.label}`}
            onClick={() => setLanguage(option.value)}
            className={cn(
              "min-h-10 min-w-11 rounded-full px-2.5 text-[11px] font-semibold tabular-nums transition",
              language === option.value ? "bg-neon-dim text-neon" : "text-fg-subtle hover:text-fg"
            )}
          >
            {option.short}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={toggleSpeakReplies}
        aria-pressed={speakReplies}
        aria-label={speakReplies ? "Spoken replies on" : "Spoken replies off"}
        title={speakReplies ? "Spoken replies on" : "Spoken replies off"}
        className={cn(
          "flex size-11 items-center justify-center rounded-full border border-white/10 bg-surface-raised transition",
          speakReplies ? "text-neon" : "text-fg-subtle hover:text-fg"
        )}
      >
        <SpeakIcon size={18} aria-hidden />
      </button>
    </div>
  );
}
