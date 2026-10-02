import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedCallback } from './use-debounced-callback';

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the latest callback once, after calls stop', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ callback }) => useDebouncedCallback(callback, 300), {
      initialProps: { callback: first },
    });

    result.current.run('a');
    result.current.run('ab');
    rerender({ callback: second });
    vi.advanceTimersByTime(300);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith('ab');
  });

  it('can be cancelled', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    result.current.run('x');
    result.current.cancel();
    vi.advanceTimersByTime(300);

    expect(callback).not.toHaveBeenCalled();
  });
});
