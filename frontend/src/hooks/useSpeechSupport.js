/**
 * Whether this browser can do voice commands (PRD VOC-1: hide the mic where it can't).
 * False during server rendering, so the first client render matches.
 */
import { useSyncExternalStore } from "react";
import { isSpeechRecognitionSupported } from "@/lib/voice/speechRecognition";

const subscribe = () => () => {};

/** @returns {boolean} */
export function useSpeechSupport() {
  return useSyncExternalStore(subscribe, isSpeechRecognitionSupported, () => false);
}
