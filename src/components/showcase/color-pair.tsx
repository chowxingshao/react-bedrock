import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

import { contrastRatio, resolveTokenRgb } from './contrast';

export interface ColorPairProps {
  /** Human label, e.g. 'Primary'. */
  name: string;
  /** Surface token var, e.g. '--primary'. */
  surfaceVar: string;
  /** Foreground token var, e.g. '--primary-foreground'. */
  foregroundVar: string;
  /** Tailwind surface class, e.g. 'bg-primary'. */
  surfaceClass: string;
  /** Tailwind foreground class, e.g. 'text-primary-foreground'. */
  foregroundClass: string;
  /** Real copy to render inside the swatch (no lorem ipsum). */
  sampleText: string;
  /** Label for a passing ratio, e.g. 'AA'. */
  passLabel: string;
  /** Label for a failing ratio, e.g. 'low'. */
  failLabel: string;
}

const AA_THRESHOLD = 4.5;

export function ColorPair({
  name,
  surfaceVar,
  foregroundVar,
  surfaceClass,
  foregroundClass,
  sampleText,
  passLabel,
  failLabel,
}: ColorPairProps) {
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    const compute = () => {
      setRatio(contrastRatio(resolveTokenRgb(surfaceVar), resolveTokenRgb(foregroundVar)));
    };
    compute();
    const observer = new MutationObserver(compute);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
    };
  }, [surfaceVar, foregroundVar]);

  const passes = ratio !== null && ratio >= AA_THRESHOLD;
  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          'flex min-h-16 items-center justify-center rounded-md p-3',
          surfaceClass,
          foregroundClass,
        )}
      >
        <span className="text-label">{sampleText}</span>
      </div>
      <div className="flex items-center justify-between text-caption text-muted-foreground">
        <span>{name}</span>
        <span className={cn(passes ? 'text-success' : 'text-destructive')}>
          {ratio === null ? '—' : `${ratio.toFixed(2)} : 1 ${passes ? passLabel : failLabel}`}
        </span>
      </div>
    </div>
  );
}
