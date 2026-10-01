import { useCallback, useEffect, useRef, useState } from 'react';

/** Copies text to the clipboard; `copied` stays true for `resetMs` (for a "Copied" hint). */
export function useCopyToClipboard(resetMs = 2_000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const clipboard = (navigator as Partial<Navigator>).clipboard;
      if (!clipboard) return false;
      try {
        await clipboard.writeText(text);
      } catch {
        return false;
      }
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setCopied(false);
      }, resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied, copy };
}
