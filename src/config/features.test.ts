import { afterEach, describe, expect, it } from 'vitest';

import {
  createEnvFlagSource,
  getFeatureFlagSource,
  isFeatureEnabled,
  setFeatureFlagSource,
  type FeatureFlagSource,
} from './features';

describe('feature flags', () => {
  const original = getFeatureFlagSource();
  afterEach(() => {
    setFeatureFlagSource(original);
  });

  it('uses the defaults unless VITE_FEATURE_FLAGS enables a flag', () => {
    expect(createEnvFlagSource([]).isEnabled('itemsExport')).toBe(false);
    expect(createEnvFlagSource(['itemsExport']).isEnabled('itemsExport')).toBe(true);
  });

  it('can be backed by another source (e.g. a remote service)', () => {
    const remote: FeatureFlagSource = { isEnabled: () => true, subscribe: () => () => undefined };
    setFeatureFlagSource(remote);
    expect(isFeatureEnabled('itemsExport')).toBe(true);
  });
});
