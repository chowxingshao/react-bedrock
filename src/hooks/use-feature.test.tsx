import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  getFeatureFlagSource,
  setFeatureFlagSource,
  type FeatureFlagSource,
} from '@/config/features';

import { useFeature } from './use-feature';

describe('useFeature', () => {
  const original = getFeatureFlagSource();
  afterEach(() => {
    setFeatureFlagSource(original);
  });

  it('re-renders when a subscribable source changes', () => {
    let enabled = false;
    const listeners = new Set<() => void>();
    const source: FeatureFlagSource = {
      isEnabled: () => enabled,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    setFeatureFlagSource(source);

    const { result } = renderHook(() => useFeature('itemsExport'));
    expect(result.current).toBe(false);

    act(() => {
      enabled = true;
      listeners.forEach((listener) => {
        listener();
      });
    });
    expect(result.current).toBe(true);
  });
});
