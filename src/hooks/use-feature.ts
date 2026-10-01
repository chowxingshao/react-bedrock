import { useSyncExternalStore } from 'react';

import { type FeatureFlag, getFeatureFlagSource } from '@/config/features';

/** Whether a feature flag is on; re-renders if a live flag source changes (spec §7.9). */
export function useFeature(flag: FeatureFlag): boolean {
  const source = getFeatureFlagSource();
  return useSyncExternalStore(source.subscribe, () => source.isEnabled(flag));
}
