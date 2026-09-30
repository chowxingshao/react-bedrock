import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { logger } from '@/core/logger';
import { notify } from '@/core/notify';

import { type AppError, getErrorMessage, isAppError } from './errors';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AppError;
    queryMeta: {
      /** Don't log this query's failures (they are expected, e.g. an existence check). */
      silent?: boolean;
    };
    mutationMeta: {
      /** Don't show the global error toast; the caller handles it (e.g. by mapping field errors). */
      silent?: boolean;
    };
  }
}

const isClientError = (error: unknown) =>
  isAppError(error) && error.status >= 400 && error.status < 500;

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
        logger.warn('Query failed', {
          error,
          queryKey: query.queryKey,
          requestId: error.requestId,
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        logger.warn('Mutation failed', {
          error,
          mutationKey: mutation.options.mutationKey,
          requestId: error.requestId,
        });
        if (!mutation.meta?.silent) notify.error(getErrorMessage(error));
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        refetchOnWindowFocus,
        // One retry for network or server trouble; a 4xx will not change by asking again.
        retry: (failureCount, error) => !isClientError(error) && failureCount < 1,
      },
      mutations: { retry: 0 },
    },
  });
}

/** The single QueryClient the app uses (mounted in src/app/providers.tsx). */
export const queryClient = createQueryClient();
