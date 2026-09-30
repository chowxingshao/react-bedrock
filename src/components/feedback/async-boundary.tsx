import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { type ReactNode, Suspense } from 'react';

import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@/core/errors';

import { ErrorState } from './error-state';
import { PageLoader } from './page-loader';

export interface AsyncBoundaryProps {
  children: ReactNode;
  /** Suspense fallback. Default: <PageLoader />. */
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
          <Suspense fallback={loading ?? <PageLoader />}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
