/**
 * Detect user inactivity.
 * - Calls onIdle once after `timeoutMs` without pointer / keyboard / scroll / touch input.
 * - Calls onActiveHeartbeat at most every `heartbeatMs` while the user is active,
 *   so the server-side idle timer can be kept in sync.
 * Also checks when the tab becomes visible again (timers pause in background tabs).
 */
import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];
const CHECK_INTERVAL_MS = 15 * 1000;

/**
 * @param {Object} options
 * @param {number} options.timeoutMs - Inactivity before onIdle fires
 * @param {() => void} options.onIdle
 * @param {number} [options.heartbeatMs] - Minimum gap between heartbeats
 * @param {() => void} [options.onActiveHeartbeat]
 * @param {boolean} [options.enabled=true]
 */
export function useIdleTimeout({
  timeoutMs,
  onIdle,
  heartbeatMs,
  onActiveHeartbeat,
  enabled = true,
}) {
  const lastActivityRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const callbacksRef = useRef({ onIdle, onActiveHeartbeat });

  // Keep the latest callbacks without restarting the listeners
  useEffect(() => {
    callbacksRef.current = { onIdle, onActiveHeartbeat };
  }, [onIdle, onActiveHeartbeat]);

  useEffect(() => {
    if (!enabled) return undefined;
    let hasFired = false;
    lastActivityRef.current = Date.now();
    lastHeartbeatRef.current = Date.now();

    const markActive = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      if (heartbeatMs && now - lastHeartbeatRef.current >= heartbeatMs) {
        lastHeartbeatRef.current = now;
        callbacksRef.current.onActiveHeartbeat?.();
      }
    };

    const checkIdle = () => {
      if (!hasFired && Date.now() - lastActivityRef.current >= timeoutMs) {
        hasFired = true;
        callbacksRef.current.onIdle();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkIdle();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, markActive, { passive: true })
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    const intervalId = setInterval(checkIdle, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(intervalId);
    };
  }, [enabled, timeoutMs, heartbeatMs]);
}
