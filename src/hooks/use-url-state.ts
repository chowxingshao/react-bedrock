import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { z } from 'zod';

/** One Zod schema per query parameter. Give each a `.default()` (or make it `.optional()`). */
export type UrlStateShape = Record<string, z.ZodType>;
export type UrlState<S extends UrlStateShape> = { [K in keyof S]: z.output<S[K]> };
export type UrlStateUpdate<S extends UrlStateShape> = Partial<{
  [K in keyof S]: z.output<S[K]> | null;
}>;

const defaultOf = (field: z.ZodType | undefined): unknown => field?.safeParse(undefined).data;

function readParams<S extends UrlStateShape>(shape: S, params: URLSearchParams): UrlState<S> {
  const state: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(shape)) {
    const parsed = field.safeParse(params.get(key) ?? undefined);
    state[key] = parsed.success ? parsed.data : defaultOf(field);
  }
  return state as UrlState<S>;
}

/**
 * React Router does not queue the functional form of `setSearchParams`: two writes in the same event
 * (a new search term, then `resetPage()` from `usePagination`) would both start from the same
 * snapshot and the first would be lost. Writes made in the same tick, by any hook instance, build
 * on each other through this value, which is cleared as soon as the tick ends.
 */
let pendingParams: URLSearchParams | undefined;

/**
 * Typed state in the URL query string (spec §7.8): shareable, bookmarkable and back-button friendly.
 * Define `shape` at module level (it must be stable). Use `z.coerce.number()` for numbers.
 */
export function useUrlState<S extends UrlStateShape>(shape: S) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => readParams(shape, searchParams), [shape, searchParams]);

  const setState = useCallback(
    (update: UrlStateUpdate<S>, { replace = true }: { replace?: boolean } = {}) => {
      const next = new URLSearchParams(pendingParams ?? searchParams);
      for (const [key, value] of Object.entries(update)) {
        if (
          value === undefined ||
          value === null ||
          value === '' ||
          value === defaultOf(shape[key])
        ) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      pendingParams = next;
      queueMicrotask(() => {
        pendingParams = undefined;
      });
      setSearchParams(next, { replace });
    },
    [shape, searchParams, setSearchParams],
  );

  return [state, setState] as const;
}
