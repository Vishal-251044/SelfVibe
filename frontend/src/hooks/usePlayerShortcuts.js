/**
 * Player keyboard shortcuts (PRD PLY-5): Space play / pause, ← / → seek,
 * Shift + ← / → previous / next, M mute. Ignored while typing in a field.
 */
import { useEffect } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { SEEK_STEP_SECONDS } from "@/utils/musicConstants";

/**
 * Whether the key press belongs to a form control or editable text.
 * @param {EventTarget|null} target
 * @returns {boolean}
 */
function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  // Range inputs (seek / volume sliders) handle arrows themselves
  return tag === "INPUT";
}

/** Install the shortcuts for the whole app. */
export function usePlayerShortcuts() {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const player = usePlayerStore.getState();
      if (!player.currentTrack()) return;

      // Space on a focused button should press that button, not toggle playback
      if (
        event.code === "Space" &&
        event.target instanceof HTMLElement &&
        event.target.closest("button, a")
      ) {
        return;
      }

      switch (event.code) {
        case "Space":
          event.preventDefault();
          player.togglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          if (event.shiftKey) player.previous();
          else player.seek(player.currentTime - SEEK_STEP_SECONDS);
          break;
        case "ArrowRight":
          event.preventDefault();
          if (event.shiftKey) player.next();
          else player.seek(player.currentTime + SEEK_STEP_SECONDS);
          break;
        case "KeyM":
          event.preventDefault();
          player.toggleMute();
          break;
        default:
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
