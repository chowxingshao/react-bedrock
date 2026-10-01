import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCopyToClipboard } from './use-copy-to-clipboard';

describe('useCopyToClipboard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('copies text and resets the copied flag after a while', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { result } = renderHook(() => useCopyToClipboard(1_000));

    await act(async () => {
      expect(await result.current.copy('item-42')).toBe(true);
    });
    expect(writeText).toHaveBeenCalledWith('item-42');
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.copied).toBe(false);
  });

  it('reports failure when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      expect(await result.current.copy('x')).toBe(false);
    });
    expect(result.current.copied).toBe(false);
  });
});
