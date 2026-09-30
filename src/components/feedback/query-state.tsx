import type { ReactNode } from 'react';

import { Delayed } from './delayed';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { PageLoader } from './page-loader';

/** The parts of a TanStack Query result that QueryState needs. Any `UseQueryResult` satisfies it. */
export interface QueryLike<TData, TError> {
  status: 'pending' | 'error' | 'success';
  data: TData | undefined;
  error: TError | null;
  refetch: () => Promise<unknown>;
}

export interface QueryStateProps<TData, TError> {
  query: QueryLike<TData, TError>;
  children: (data: TData) => ReactNode;
  /** Shown while the first load is pending, after SKELETON_DELAY_MS. Default: <PageLoader />. */
  loading?: ReactNode;
  /** Shown when `isEmpty(data)` is true. Default: <EmptyState />. */
  empty?: ReactNode;
  /** Default: null data or an empty array. */
  isEmpty?: (data: TData) => boolean;
  /** Replaces the default <ErrorState />, whose "Try again" calls `query.refetch()`. */
  error?: ReactNode | ((error: TError, retry: () => void) => ReactNode);
}

function defaultIsEmpty(data: unknown): boolean {
  return data === null || (Array.isArray(data) && data.length === 0);
}

/**
 * Renders the right view for a query: loading, error (with retry), empty or success (spec §5.4).
 * Minimal usage: <QueryState query={q}>{(data) => …}</QueryState>
 */
export function QueryState<TData, TError = unknown>({
  query,
  children,
  loading,
  empty,
  isEmpty = defaultIsEmpty,
  error,
}: QueryStateProps<TData, TError>) {
  const retry = () => {
    void query.refetch();
  };

  // Data we already have wins over a failed background refetch (the global handler reports that error).
  if (query.data !== undefined) {
    return isEmpty(query.data) ? (empty ?? <EmptyState />) : children(query.data);
  }
  if (query.status === 'error') {
    if (typeof error === 'function') return error(query.error as TError, retry);
    return error ?? <ErrorState error={query.error} onRetry={retry} />;
  }
  return <Delayed>{loading ?? <PageLoader delayMs={0} />}</Delayed>;
}
