import { setupWorker } from 'msw/browser';

import { env } from '@/config/env';

import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/** Starts the in-browser mock API (VITE_ENABLE_MOCKS=true). Requests without a handler go to the network. */
export async function startMockWorker(): Promise<void> {
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: !env.isDev,
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}
