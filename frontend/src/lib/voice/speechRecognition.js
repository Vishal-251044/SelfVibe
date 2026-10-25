/**
 * Thin wrapper over the browser's Web Speech API (PRD VOC-1/2/6).
 * - isSpeechRecognitionSupported(): the mic is hidden where this is false
 *   (Firefox, older Safari) — VOC-1
 * - The mic is only on between start() and stop()/abort(): never in the
 *   background, and audio never leaves the browser's speech service — VOC-6
 * - speak(): optional spoken reply (speech synthesis)
 */

/** @returns {typeof window.SpeechRecognition|null} */
function getRecognitionClass() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/** @returns {boolean} */
export function isSpeechRecognitionSupported() {
  return getRecognitionClass() !== null;
}

/** @returns {boolean} */
export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Errors that mean "the user didn't say anything", not a failure. */
const QUIET_ERRORS = new Set(["no-speech", "aborted"]);

/**
 * Error codes → what to tell the user.
 * @param {string} code - SpeechRecognitionErrorEvent.error
 * @returns {string}
 */
export function describeSpeechError(code) {
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "microphone access is blocked — allow it in your browser settings";
  }
  if (code === "network") return "voice needs an internet connection";
  if (code === "audio-capture") return "no microphone found";
  if (code === "language-not-supported") return "this language isn't supported here";
  return "couldn't hear that — try again";
}

/**
 * Start listening once.
 * @param {Object} options
 * @param {"en-IN"|"hi-IN"} options.lang
 * @param {(text: string) => void} [options.onInterim] - Live partial transcript
 * @param {(result: { transcript: string, confidence: number|null }) => void} options.onResult
 * @param {(error: { code: string, quiet: boolean }) => void} [options.onError]
 * @param {() => void} [options.onEnd] - Always called last
 * @returns {{ stop: () => void, abort: () => void }|null} null when unsupported
 */
export function startRecognition({ lang, onInterim, onResult, onError, onEnd }) {
  const Recognition = getRecognitionClass();
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = false; // one command per tap / hold
  recognition.maxAlternatives = 1;

  let isDone = false;
  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) {
        isDone = true;
        onResult({
          transcript: result[0].transcript.trim(),
          confidence:
            Number.isFinite(result[0].confidence) && result[0].confidence > 0
              ? result[0].confidence
              : null,
        });
        return;
      }
      interim += result[0].transcript;
    }
    if (interim) onInterim?.(interim.trim());
  };
  recognition.onerror = (event) => {
    isDone = true;
    onError?.({ code: event.error, quiet: QUIET_ERRORS.has(event.error) });
  };
  recognition.onend = () => {
    if (!isDone) onError?.({ code: "no-speech", quiet: true });
    onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    // start() throws if a previous session is still closing
    queueMicrotask(() => {
      onError?.({ code: "busy", quiet: false });
      onEnd?.();
    });
  }
  return {
    stop: () => recognition.stop(), // finish and deliver what was heard
    abort: () => recognition.abort(),
  };
}

/**
 * Say a short reply out loud (optional, VOC-5).
 * @param {string} text
 * @param {"en-IN"|"hi-IN"} lang
 */
export function speak(text, lang) {
  if (!isSpeechSynthesisSupported() || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.05;
  const voice = window.speechSynthesis.getVoices().find((option) => option.lang === lang);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}
