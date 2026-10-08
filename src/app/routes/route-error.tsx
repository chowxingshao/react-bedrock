import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import { ErrorState, NotFoundState } from '@/components/feedback';
import { logger } from '@/core/logger';

/**
 * Route-level error boundary (the router's errorElement). Errors inside a page keep the app shell. What it
 * shows replaces the whole page, so its title is the page's h1.
 */
export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();

  useEffect(() => {
    logger.error('Route error', { error });
  }, [error]);

  if (isRouteErrorResponse(error) && error.status === 404)
    return <NotFoundState headingLevel={1} />;
  return (
    <div className="p-6">
      <ErrorState
        error={error}
        headingLevel={1}
        retryLabel={t('actions.reload')}
        onRetry={() => {
          window.location.reload(); // also fixes chunks that went stale after a deploy
        }}
      />
    </div>
  );
}
