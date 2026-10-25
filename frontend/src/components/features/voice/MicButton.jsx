"use client";

/**
 * Voice mic (PRD VOC-1/6, roadmap Day 7): tap to talk (tap again to finish),
 * or press and hold and let go when done. Hidden where the browser has no
 * speech recognition. Glows with pulsing rings while listening.
 */
import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Mic } from "lucide-react";
import { useVoiceStore } from "@/store/voiceStore";
import { useSpeechSupport } from "@/hooks/useSpeechSupport";
import { startListening, stopListening } from "@/lib/voice/voiceSession";
import { VOICE_HOLD_MS } from "@/utils/musicConstants";
import { tapPress } from "@/utils/animations";
import { cn } from "@/utils/genericFunctions";
import { useAppSettings } from "@/hooks/useAppSettings";

const RING_DELAYS = [0, 0.5];

/**
 * @param {Object} props
 * @param {number} [props.size=20] - Icon size
 * @param {"plain"|"filled"} [props.variant="plain"] - "filled" = tinted circle (search box)
 * @param {string} [props.className]
 */
export default function MicButton({ size = 20, variant = "plain", className }) {
  // Hidden where the browser can't listen, or while the Owner has voice switched off
  const canListen = useSpeechSupport();
  const { isFeatureOn } = useAppSettings();
  const isSupported = canListen && isFeatureOn("voice");
  const status = useVoiceStore((state) => state.status);
  const prefersReducedMotion = useReducedMotion();
  const pressedAt = useRef(0);
  const startedHere = useRef(false);

  if (!isSupported) return null;

  const isListening = status === "listening";
  const isThinking = status === "thinking";

  /** Press: open the mic at once (fast feedback), or finish a tap session. */
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (isListening) {
      startedHere.current = false;
      stopListening();
      return;
    }
    pressedAt.current = performance.now();
    startedHere.current = true;
    startListening("hold");
  };

  /** Release: a long press was hold-to-talk, so finish; a short one keeps listening (tap). */
  const onPointerUp = (event) => {
    event.stopPropagation();
    if (!startedHere.current) return;
    startedHere.current = false;
    if (performance.now() - pressedAt.current >= VOICE_HOLD_MS) stopListening();
    else useVoiceStore.getState().setSession({ mode: "tap" });
  };

  /** Keyboard (Enter / Space) acts like a tap. */
  const onKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (isListening) stopListening();
    else startListening("tap");
  };

  return (
    <motion.button
      type="button"
      whileTap={tapPress}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={isListening ? "Stop listening" : "Voice command (tap, or hold to talk)"}
      aria-pressed={isListening}
      disabled={isThinking}
      className={cn(
        "relative flex size-11 shrink-0 touch-none items-center justify-center rounded-full transition select-none",
        variant === "filled"
          ? "bg-neon-dim text-neon hover:bg-neon hover:text-black"
          : "text-fg-muted hover:text-neon",
        isListening && "bg-neon text-black shadow-glow-sm hover:text-black",
        className
      )}
    >
      {isListening &&
        !prefersReducedMotion &&
        RING_DELAYS.map((delay) => (
          <motion.span
            key={delay}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-neon"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, delay, ease: "easeOut" }}
          />
        ))}
      {isThinking ? (
        <Loader2 size={size} className="animate-spin" aria-hidden />
      ) : (
        <Mic size={size} aria-hidden />
      )}
    </motion.button>
  );
}
