import type { HttpHandler } from 'msw';

/**
 * Every mock API handler, shared by the browser worker (dev and the Docker demo) and the test server.
 * Features append theirs here; `pnpm gen feature` does it automatically.
 */
export const handlers: HttpHandler[] = [
  // plop:handlers
];
