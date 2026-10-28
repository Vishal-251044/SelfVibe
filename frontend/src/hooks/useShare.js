/**
 * Share a song, playlist or artist (PRD §10.8, roadmap Day 10): the phone's
 * share sheet where there is one (Android / iPhone), otherwise copy the link.
 * Each completed share is counted for the song stats; a cancelled share
 * sheet is not.
 */
import { useCallback } from "react";
import { recordShare } from "@/services/share.service";
import { showToast } from "@/store/toastStore";
import { buildShareUrl } from "@/utils/genericFunctions";

/**
 * @returns {(item: { type: "track"|"playlist"|"artist", id: string, slug?: string|null, title: string, text?: string }) => Promise<void>}
 */
export function useShare() {
  return useCallback(async ({ type, id, slug = null, title, text }) => {
    const url = buildShareUrl(type, slug ?? id);
    let channel = "copy";

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: text ?? title, url });
        channel = "native";
      } catch (error) {
        if (error?.name === "AbortError") return; // closed the share sheet
        // Share sheet not allowed here (e.g. desktop policy): copy instead
      }
    }

    if (channel === "copy") {
      try {
        await navigator.clipboard.writeText(url);
        showToast({ message: "link copied", tone: "success" });
      } catch {
        showToast({ message: url, tone: "info", durationMs: 8000 });
        return;
      }
    }
    // Counting must never get in the way of sharing
    recordShare({ targetType: type, targetId: id, channel }).catch(() => {});
  }, []);
}
