import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useOnlineStatus } from './use-online-status';

describe('useOnlineStatus', () => {
  it('follows the browser online and offline events', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      onLine.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });
});
