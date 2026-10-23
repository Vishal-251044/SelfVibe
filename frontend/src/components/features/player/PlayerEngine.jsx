"use client";

/**
 * Mounts the player's engine once for the whole app (root layout):
 * - the ONE shared <audio> element (never recreated — keeps background play
 *   alive across pages and on iOS, PRD BGP-6)
 * - restores the saved queue and settings
 * - starts the listening-event queue (batched sends, BGP-7)
 * - keyboard shortcuts (PLY-5)
 * - stops playback and forgets the queue when the listener (or, for console
 *   previews, the staff member) logs out
 * Renders no visible UI; the player bars live in the app / console shells.
 */
import { useEffect, useRef } from "react";
import { initAudioEngine, resetAudioEngine } from "@/lib/player/audioEngine";
import { clearListenEvents, startListenEventQueue } from "@/lib/player/listenEventQueue";
import { clearStreamUrls } from "@/lib/player/streamUrlCache";
import { usePlayerShortcuts } from "@/hooks/usePlayerShortcuts";
import { usePlayerStore } from "@/store/playerStore";
import { useAuthStore } from "@/store/authStore";
import { useStaffAuthStore } from "@/store/staffAuthStore";

export default function PlayerEngine() {
  const audioRef = useRef(null);
  usePlayerShortcuts();

  useEffect(() => {
    usePlayerStore.persist.rehydrate();
    const stopEngine = initAudioEngine(audioRef.current);
    const stopQueue = startListenEventQueue();

    // Log out → stop the music and forget this listener's queue and events
    const unsubscribeAuth = useAuthStore.subscribe((state, previous) => {
      if (previous.status === "authenticated" && state.status === "unauthenticated") {
        if (usePlayerStore.getState().scope === "user") resetAudioEngine();
        clearListenEvents();
        clearStreamUrls();
      }
    });
    const unsubscribeStaff = useStaffAuthStore.subscribe((state, previous) => {
      if (previous.status === "authenticated" && state.status === "unauthenticated") {
        if (usePlayerStore.getState().scope === "staff") resetAudioEngine();
      }
    });
    return () => {
      stopEngine();
      stopQueue();
      unsubscribeAuth();
      unsubscribeStaff();
    };
  }, []);

  // playsInline keeps iPhone from opening its own full-screen player
  return <audio ref={audioRef} playsInline aria-hidden className="hidden" />;
}
