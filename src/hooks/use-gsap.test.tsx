import { render } from '@testing-library/react';
import gsap from 'gsap';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useGsap } from './use-gsap';

// The setup stub returns matches:false for every query; override per case.
function stubMatchMedia(matchingQuery: string) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === matchingQuery,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  // Restore the setup default (matches:false for all).
  stubMatchMedia('__none__');
});

function Demo({
  onRun,
  boxRef,
}: {
  onRun: () => void;
  boxRef: { current: HTMLDivElement | null };
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(
    () => {
      onRun();
      if (ref.current) gsap.to(ref.current, { x: 100, duration: 1 });
    },
    { scope: ref },
  );
  return (
    <div
      ref={(el) => {
        ref.current = el;
        boxRef.current = el;
      }}
    />
  );
}

describe('useGsap', () => {
  it('runs the factory when motion is allowed', () => {
    stubMatchMedia('(prefers-reduced-motion: no-preference)');
    const onRun = vi.fn();
    render(<Demo onRun={onRun} boxRef={{ current: null }} />);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('does not run the factory under reduced motion', () => {
    stubMatchMedia('(prefers-reduced-motion: reduce)');
    const onRun = vi.fn();
    render(<Demo onRun={onRun} boxRef={{ current: null }} />);
    expect(onRun).not.toHaveBeenCalled();
  });

  it('reverts its animations on unmount', () => {
    stubMatchMedia('(prefers-reduced-motion: no-preference)');
    const boxRef = { current: null as HTMLDivElement | null };
    const { unmount } = render(<Demo onRun={() => undefined} boxRef={boxRef} />);
    const box = boxRef.current;
    expect(box).not.toBeNull();
    expect(gsap.getTweensOf(box).length).toBeGreaterThan(0);
    unmount();
    expect(gsap.getTweensOf(box).length).toBe(0);
  });
});
