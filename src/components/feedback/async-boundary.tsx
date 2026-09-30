import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { type ReactNode, Suspense } from 'react';

import { SUSPENSE_FALLBACK_DELAY_MS } from '@/config/constants';
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@/core/errors';

import { Delayed } from './delayed';
import { ErrorState } from './error-state';
import { PageLoader } from './page-loader';

export interface AsyncBoundaryProps {
  children: ReactNode;
  /**
   * Suspense fallback, shown after SUSPENSE_FALLBACK_DELAY_MS. Default: <PageLoader />.
   * Pass `null` to render nothing while suspended.
   */
  loading?: ReactNode;
  /** Error fallback. Default: <ErrorState /> whose "Try again" also resets failed queries. */
  error?: (props: ErrorBoundaryFallbackProps) => ReactNode;
  resetKeys?: readonly unknown[];
}

const defaultError = ({ error, reset }: ErrorBoundaryFallbackProps) => (
  <ErrorState error={error} onRetry={reset} />
);

/** Suspense + error boundary in one, for `useSuspenseQuery` and lazy components (spec §5.4). */
export function AsyncBoundary({
  children,
  loading,
  error = defaultError,
  resetKeys,
}: AsyncBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} resetKeys={resetKeys} fallback={error}>
          <Suspense
            fallback={
              <Delayed delayMs={SUSPENSE_FALLBACK_DELAY_MS}>
                {loading === undefined ? <PageLoader delayMs={0} /> : loading}
              </Delayed>
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
