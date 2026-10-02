import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';

import { AsyncBoundary, ErrorState } from '@/components/feedback';
import { Button } from '@/components/ui/button';
import type { ErrorBoundaryFallbackProps } from '@/core/errors';

function PageErrorFallback({ error, reset }: ErrorBoundaryFallbackProps) {
  const { t } = useTranslation();
  return (
    <div className="grid justify-items-center gap-2">
      <ErrorState error={error} onRetry={reset} className="w-full" />
      <Button
        type="button"
        variant="link"
        onClick={() => {
          window.location.reload();
        }}
      >
        {t('actions.reload')}
      </Button>
    </div>
  );
}

/**
 * The boundary around every page of the app shell. It is the route element of the group that has the
 * router's `errorElement`, so it sits below the router's own boundary and catches page errors first: a
 * failed `useSuspenseQuery` or a render error shows **Try again** (which also resets failed queries)
 * and **Reload page**, and the error clears when the user navigates. The router's `errorElement`
 * keeps what only the router sees: a page chunk that fails to load, a thrown Response, a loader error.
 */
export function PageBoundary() {
  const { pathname } = useLocation();
  return (
    <AsyncBoundary resetKeys={[pathname]} error={(props) => <PageErrorFallback {...props} />}>
      <Outlet />
    </AsyncBoundary>
  );
}
