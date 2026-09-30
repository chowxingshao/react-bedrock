import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/globals.css';
import '@/core/i18n';
import { App } from '@/app/App';
import { ConfigErrorScreen } from '@/app/config-error-screen';
import { env, envIssues } from '@/config/env';
import { installGlobalErrorHandlers, reactRootErrorHandlers } from '@/core/errors';
import { logger } from '@/core/logger';

installGlobalErrorHandlers();

/** Starts Mock Service Worker when VITE_ENABLE_MOCKS is on (the default), before any request is made. */
async function enableMocking(): Promise<void> {
  if (!env.VITE_ENABLE_MOCKS) return;
  if (env.VITE_APP_ENV === 'production') {
    logger.warn(
      'The mock API is enabled in production. Set VITE_ENABLE_MOCKS=false for real deployments.',
    );
  }
  try {
    const { startMockWorker } = await import('@/mocks/browser');
    await startMockWorker();
  } catch (error) {
    // e.g. service workers are unavailable over plain http on a non-localhost address
    logger.error('Mock Service Worker failed to start; API calls will go to the network', {
      error,
    });
  }
}

await enableMocking();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container, reactRootErrorHandlers).render(
  <StrictMode>
    {envIssues.length > 0 ? <ConfigErrorScreen issues={envIssues} /> : <App />}
  </StrictMode>,
);
