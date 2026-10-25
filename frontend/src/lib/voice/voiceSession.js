/**
 * One voice session at a time for the whole app (PRD VOC-1..8, roadmap Day 7).
 * Every mic button (mini player, Now Playing, search) drives this module:
 * listen → understand (on device) → act → terminal toast (+ spoken reply)
 * → text-only log. The music is ducked only while the mic is open (VOC-8),
 * and the mic is never on outside a tap / hold (VOC-6).
 */
import { useVoiceStore } from "@/store/voiceStore";
import { usePlayerStore } from "@/store/playerStore";
import { showToast, useToastStore } from "@/store/toastStore";
import { parseVoiceCommand } from "@/lib/voice/commandParser";
import { runVoiceCommand } from "@/lib/voice/voiceActions";
import { describeSpeechError, speak, startRecognition } from "@/lib/voice/speechRecognition";
import { logVoiceCommand } from "@/services/voice.service";
import { getCatalogFilter } from "@/hooks/useCatalogFilter";
import { VOICE_LANGUAGES, VOICE_TIMEOUT_MS, VOICE_TOAST_MS } from "@/utils/musicConstants";

const TOAST_ID = "voice";
let recognizer = null;
let timeoutId = 0;
let queryClient = null;

/**
 * Give the session the app's React Query client (cache updates after likes).
 * @param {import("@tanstack/react-query").QueryClient} client
 */
export function setVoiceQueryClient(client) {
  queryClient = client;
}

/** @returns {string} e.g. "EN" */
function languageTag() {
  const { language } = useVoiceStore.getState();
  return VOICE_LANGUAGES.find((option) => option.value === language)?.short ?? "EN";
}

/** Close the mic and bring the music back up. */
function endListening() {
  clearTimeout(timeoutId);
  recognizer = null;
  usePlayerStore.getState().setDucked(false);
  const voice = useVoiceStore.getState();
  if (voice.status === "listening") voice.setSession({ status: "idle", interim: "" });
}

/**
 * Act on what was heard.
 * @param {{ transcript: string, confidence: number|null }} result
 */
async function handleResult({ transcript, confidence }) {
  const heardAt = performance.now();
  const voice = useVoiceStore.getState();
  const { language } = voice;
  voice.setSession({ status: "thinking", interim: "" });
  usePlayerStore.getState().setDucked(false);

  const command = parseVoiceCommand(transcript);
  const commandLine = `selfvibe voice "${transcript}"`;
  // VOC-5: something on screen right away, even while a song is looked up
  showToast({
    id: TOAST_ID,
    command: commandLine,
    message: command.intent === "play" ? `searching '${command.query}'…` : "working…",
    tone: "pending",
  });

  let outcome;
  try {
    outcome = await runVoiceCommand(command, {
      language,
      catalog: getCatalogFilter(),
      queryClient,
    });
  } catch (error) {
    outcome = {
      outcome: "failed",
      tone: "error",
      message: error?.message ?? "something went wrong",
    };
  }

  showToast({
    id: TOAST_ID,
    command: commandLine,
    message: outcome.message,
    tone: outcome.tone,
    durationMs: VOICE_TOAST_MS,
  });
  if (outcome.picker) useVoiceStore.getState().setPicker(outcome.picker);
  if (useVoiceStore.getState().speakReplies) speak(outcome.message, language);
  useVoiceStore.getState().setSession({ status: "idle" });

  // Text only, never audio (VOC-6/7); a failed log never bothers the user
  logVoiceCommand({
    transcript: transcript.slice(0, 200),
    language,
    intent: command.intent,
    outcome: outcome.outcome,
    confidence,
    latencyMs: Math.round(performance.now() - heardAt),
  }).catch(() => {});
}

/**
 * Open the mic.
 * @param {"tap"|"hold"} [mode="tap"]
 */
export function startListening(mode = "tap") {
  const voice = useVoiceStore.getState();
  if (voice.status !== "idle" || recognizer) return;

  voice.setSession({ status: "listening", mode, interim: "" });
  usePlayerStore.getState().setDucked(true);
  showToast({
    id: TOAST_ID,
    command: `selfvibe voice --listen [${languageTag()}]`,
    message: "listening…",
    tone: "pending",
  });

  recognizer = startRecognition({
    lang: voice.language,
    onInterim: (text) => {
      useVoiceStore.getState().setSession({ interim: text });
      showToast({
        id: TOAST_ID,
        command: `selfvibe voice --listen [${languageTag()}]`,
        message: `"${text}"`,
        tone: "pending",
      });
    },
    onResult: (result) => {
      endListening();
      if (result.transcript) handleResult(result);
      else useToastStore.getState().dismiss(TOAST_ID);
    },
    onError: ({ code, quiet }) => {
      endListening();
      if (quiet) {
        showToast({
          id: TOAST_ID,
          command: "selfvibe voice --listen",
          message: "didn't hear anything",
          tone: "info",
          durationMs: 2000,
        });
      } else {
        showToast({
          id: TOAST_ID,
          command: "selfvibe voice --listen",
          message: describeSpeechError(code),
          tone: "error",
          durationMs: VOICE_TOAST_MS,
        });
      }
    },
    onEnd: endListening,
  });

  if (!recognizer) {
    endListening();
    showToast({
      id: TOAST_ID,
      command: "selfvibe voice",
      message: "voice isn't supported in this browser",
      tone: "error",
    });
    return;
  }
  timeoutId = setTimeout(() => recognizer?.stop(), VOICE_TIMEOUT_MS);
}

/** Finish listening and use what was heard (hold released, or a second tap). */
export function stopListening() {
  recognizer?.stop();
}

/** Close the mic without acting (e.g. leaving the page). */
export function cancelListening() {
  recognizer?.abort();
  endListening();
}
