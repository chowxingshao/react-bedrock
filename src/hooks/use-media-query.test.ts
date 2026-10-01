import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  it('reflects the query and follows changes', () => {
    let matches = false;
    const listeners = new Set<() => void>();
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          media: query,
          get matches() {
            return matches;
          },
          addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
          removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
        }) as unknown as MediaQueryList,
    );

    const { result } = renderHook(() => useMediaQuery('(min-width: 48rem)'));
    expect(result.current).toBe(false);

    act(() => {
      matches = true;
      listeners.forEach((listener) => {
        listener();
      });
    });
    expect(result.current).toBe(true);
  });
});
