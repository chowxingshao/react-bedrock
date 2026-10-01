import type { HttpHandler } from 'msw';

import { authHandlers } from './handlers/auth';

/**
 * Every mock API handler, shared by the browser worker (dev, and the Docker demo once it exists) and the
 * test server. Features append theirs here; the generators (planned) will do it automatically.
 */
export const handlers: HttpHandler[] = [
  ...authHandlers,
  // plop:handlers
];
