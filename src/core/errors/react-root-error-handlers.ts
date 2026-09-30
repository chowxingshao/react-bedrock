import type { RootOptions } from 'react-dom/client';

import { logger } from '@/core/logger';

/**
 * React 19 root error callbacks, passed to createRoot().
 * They cover boundaries we don't own (e.g. the router's). The logger drops duplicate reports of the same error.
 */
export const reactRootErrorHandlers: Pick<
  RootOptions,
  'onCaughtError' | 'onRecoverableError' | 'onUncaughtError'
> = {
  onUncaughtError: (error, info) => {
    logger.error('Uncaught React error', { error, componentStack: info.componentStack });
  },
  onCaughtError: (error, info) => {
    logger.error('React error caught by a boundary', {
      error,
      componentStack: info.componentStack,
    });
  },
  onRecoverableError: (error, info) => {
    logger.warn('React recovered from an error', { error, componentStack: info.componentStack });
  },
};
