"use client";

/**
 * Voice language (English / Hindi — Hinglish works in both) and the
 * "spoken replies" toggle (PRD VOC-2/5). Hidden where voice isn't supported.
 */
import { Volume2, VolumeX } from "lucide-react";
import { useVoiceStore } from "@/store/voiceStore";
import { useSpeechSupport } from "@/hooks/useSpeechSupport";
import { VOICE_LANGUAGES } from "@/utils/musicConstants";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string} [props.className]
 */
export default function VoiceSettings({ className }) {
  const isSupported = useSpeechSupport();
  const language = useVoiceStore((state) => state.language);
  const speakReplies = useVoiceStore((state) => state.speakReplies);
  const setLanguage = useVoiceStore((state) => state.setLanguage);
  const toggleSpeakReplies = useVoiceStore((state) => state.toggleSpeakReplies);

  if (!isSupported) return null;
  const SpeakIcon = speakReplies ? Volume2 : VolumeX;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="radiogroup"
        aria-label="Voice language"
        className="inline-flex rounded-full border border-line p-0.5"
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
              "min-h-10 min-w-11 rounded-full px-3 font-mono text-xs transition",
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
          "flex size-11 items-center justify-center rounded-full border border-line transition",
          speakReplies ? "text-neon" : "text-fg-subtle hover:text-fg"
        )}
      >
        <SpeakIcon size={18} aria-hidden />
      </button>
    </div>
  );
}
