/**
 * Copy text to the clipboard and remember for a moment that it was copied
 * (for "Copied" feedback on the button).
 */
import { useCallback, useEffect, useRef, useState } from "react";

const COPIED_FEEDBACK_MS = 2000;

/**
 * @returns {{ copy: (text: string) => Promise<boolean>, isCopied: boolean }}
 */
export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
      return true;
    } catch {
      return false; // clipboard blocked (e.g. insecure context); the text is still visible
    }
  }, []);

  return { copy, isCopied };
}
