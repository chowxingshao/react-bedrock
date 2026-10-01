import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDisclosure } from './use-disclosure';

describe('useDisclosure', () => {
  it('opens, closes and toggles', () => {
    const { result } = renderHook(() => useDisclosure());
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.setOpen(true);
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
