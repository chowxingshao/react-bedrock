import { useEffect, useMemo, useRef } from 'react';

/**
 * Calls the latest `callback` once calls stop for `delayMs` (e.g. committing a search to the URL).
 * `cancel()` drops a pending call. The timer is cleared on unmount.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs = 300,
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const timer = timerRef;
    return () => {
      window.clearTimeout(timer.current);
    };
  }, []);

  return useMemo(
    () => ({
      run: (...args: Args) => {
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          callbackRef.current(...args);
        }, delayMs);
      },
      cancel: () => {
        window.clearTimeout(timerRef.current);
      },
    }),
    [delayMs],
  );
}
