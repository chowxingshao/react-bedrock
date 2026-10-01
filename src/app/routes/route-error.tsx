import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import { ErrorState, NotFoundState } from '@/components/feedback';
import { logger } from '@/core/logger';

/** Route-level error boundary (the router's errorElement). Errors inside a page keep the app shell. */
export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();

  useEffect(() => {
    logger.error('Route error', { error });
  }, [error]);

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundState />;
  return (
    <div className="p-6">
      <ErrorState
        error={error}
        retryLabel={t('actions.reload')}
        onRetry={() => {
          window.location.reload(); // also fixes chunks that went stale after a deploy
        }}
      />
    </div>
  );
}
