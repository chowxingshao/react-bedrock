import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { RefObject } from 'react';

// Registering useGSAP lets GSAP track it; required before using the hook.
gsap.registerPlugin(useGSAP);

// `useGSAP`'s first parameter is `ContextFunc | useGSAPConfig`; keep only the callable half.
type GsapContextFn = Extract<Parameters<typeof useGSAP>[0], (...args: never[]) => unknown>;

export interface UseGsapOptions {
  /** Scope for selector text, so `.box` is limited to this root. Strongly recommended. */
  scope?: RefObject<Element | null> | Element | string;
  /** Re-run (reverting the previous run) when these change. */
  dependencies?: unknown[];
  /** Revert + re-run on every dependency change. */
  revertOnUpdate?: boolean;
}

/**
 * Reduced-motion-safe GSAP setup for React.
 *
 * Wraps `@gsap/react`'s `useGSAP` (a ref-scoped `gsap.context` that auto-reverts on unmount)
 * and runs `factory` only under `(prefers-reduced-motion: no-preference)` via `gsap.matchMedia`,
 * so it no-ops when the user prefers reduced motion. Author animations so the un-animated DOM is
 * the final state — under reduced motion the element simply stays in that state.
 *
 * Not imported anywhere by default, so GSAP stays out of the bundle unless a project uses it.
 */
export function useGsap(factory: GsapContextFn, options?: UseGsapOptions) {
  return useGSAP((context, contextSafe) => {
    const mm = gsap.matchMedia();
    mm.add(
      '(prefers-reduced-motion: no-preference)',
      () => factory(context, contextSafe) as (() => void) | undefined,
    );
  }, options);
}
