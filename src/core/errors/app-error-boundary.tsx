import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

// Deep import on purpose: the feedback index re-exports AsyncBoundary, which imports @/core/errors (cycle).
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { logger } from '@/core/logger';

import { ErrorBoundary, type ErrorBoundaryFallbackProps } from './error-boundary';

function RootErrorFallback({ error, reset }: ErrorBoundaryFallbackProps) {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="grid w-full max-w-xl justify-items-center gap-2">
        <ErrorState error={error} onRetry={reset} headingLevel={1} className="w-full" />
        <Button
          variant="link"
          onClick={() => {
            window.location.reload();
          }}
        >
          {t('actions.reload')}
        </Button>
      </div>
    </main>
  );
}

/** App-root boundary (spec §7.3): logs render errors with their component stack and offers retry or reload. */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(props) => <RootErrorFallback {...props} />}
      onError={(error, info) => {
        logger.error('Unhandled render error', { error, componentStack: info.componentStack });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
