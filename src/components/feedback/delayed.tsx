import { type ReactNode, useEffect, useState } from 'react';

import { SKELETON_DELAY_MS } from '@/config/constants';

interface DelayedProps {
  children: ReactNode;
  /** Milliseconds to wait before rendering `children` (default SKELETON_DELAY_MS). */
  delayMs?: number;
}

/** Renders children only after a short delay, so loading indicators never flash for fast responses. */
export function Delayed({ children, delayMs = SKELETON_DELAY_MS }: DelayedProps) {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  return visible ? children : null;
}
