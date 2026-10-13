import { env } from './env';

/**
 * Every feature flag and its default (spec §7.9).
 * Turn flags on with VITE_FEATURE_FLAGS="itemsExport,otherFlag", at build time or at container start.
 */
export const FEATURE_FLAGS = {
  /** Shows "Export CSV" on the items list. */
  itemsExport: false,
} satisfies Record<string, boolean>;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/** Where flag values come from. Swap the env source for a remote one without touching callers. */
export interface FeatureFlagSource {
  isEnabled: (flag: FeatureFlag) => boolean;
  /** For live sources: call `listener` whenever any flag changes; returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
}

export function createEnvFlagSource(
  enabled: readonly string[] = env.VITE_FEATURE_FLAGS,
): FeatureFlagSource {
  const on = new Set(enabled);
  return {
    isEnabled: (flag) => on.has(flag) || FEATURE_FLAGS[flag],
    subscribe: () => () => undefined, // env flags never change at runtime
  };
}

let source: FeatureFlagSource = createEnvFlagSource();

/**
 * Replaces the flag source. Call it before the first render: mounted `useFeature` consumers keep
 * reading the old source until they re-render.
 */
export function setFeatureFlagSource(next: FeatureFlagSource): void {
  source = next;
}

export function getFeatureFlagSource(): FeatureFlagSource {
  return source;
}

/** Non-React access (e.g. in route definitions). In components, use `useFeature(flag)`. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return source.isEnabled(flag);
}
