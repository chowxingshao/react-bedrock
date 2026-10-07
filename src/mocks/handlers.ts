import type { HttpHandler } from 'msw';

import { authHandlers } from './handlers/auth';
import { itemHandlers } from './handlers/items';
// plop:handlers-imports

/**
 * Every mock API handler, shared by the browser worker (dev, and the Docker demo once it exists) and the
 * test server. Features append theirs here; `pnpm gen feature` does it (docs/generators.md).
 */
export const handlers: HttpHandler[] = [
  ...authHandlers,
  ...itemHandlers,
  // plop:handlers
];
