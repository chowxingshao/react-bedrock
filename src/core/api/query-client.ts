import { CancelledError, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { logger } from '@/core/logger';
import { notify } from '@/core/notify';

import { type AppError, getErrorMessage, isAppError, toAppError } from './errors';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AppError;
    queryMeta: {
      /**
       * Skip the query cache's own `Query failed` log for this query. An error that came from `http`
       * is still logged by the HTTP interceptor, which this does not silence.
       */
      silent?: boolean;
    };
    mutationMeta: {
      /**
       * Don't show the global error toast; the caller handles it (e.g. by mapping field errors).
       * The failure is still logged.
       */
      silent?: boolean;
    };
  }
}

/**
 * What the cache handlers and the retry policy need to know about a failure. `defaultError` is only
 * a type: a `queryFn` or `mutationFn` that does not go through `http` can throw anything (a raw
 * Axios error, a `ZodError`, a `TypeError`), so the thrown value is normalised first.
 */
function inspectFailure(error: unknown) {
  // The same object when it already is an AppError, so the logger can de-duplicate against the
  // interceptor's log of it.
  const appError = toAppError(error);
  return {
    appError,
    // Nothing went wrong: the caller aborted the request, which is not logged, toasted or retried.
    cancelled: error instanceof CancelledError || appError.code === 'CANCELLED',
    // Not an AppError: a bug, or a service that bypasses `http`. Production must see it.
    unexpected: !isAppError(error),
  };
}

const isClientError = (error: AppError) => error.status >= 400 && error.status < 500;

export interface QueryClientOptions {
  refetchOnWindowFocus?: boolean;
}

/** The app's TanStack Query setup (spec §6.2). */
export function createQueryClient({
  refetchOnWindowFocus = false,
}: QueryClientOptions = {}): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.silent) return;
        const { appError, cancelled, unexpected } = inspectFailure(error);
        if (cancelled) return;
        logger[unexpected ? 'error' : 'warn']('Query failed', {
          error: appError,
          queryKey: query.queryKey,
          requestId: appError.requestId,
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        const { appError, cancelled, unexpected } = inspectFailure(error);
        if (cancelled) return;
        logger[unexpected ? 'error' : 'warn']('Mutation failed', {
          error: appError,
          mutationKey: mutation.options.mutationKey,
          requestId: appError.requestId,
        });
        if (!mutation.meta?.silent) notify.error(getErrorMessage(appError));
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        refetchOnWindowFocus,
        // One retry for network or server trouble; a 4xx will not change by asking again, and a
        // cancelled request was abandoned on purpose.
        retry: (failureCount, error) => {
          const { appError, cancelled } = inspectFailure(error);
          return !cancelled && !isClientError(appError) && failureCount < 1;
        },
      },
      mutations: { retry: 0 },
    },
  });
}

/** The single QueryClient the app uses (mounted in src/app/providers.tsx). */
export const queryClient = createQueryClient();
