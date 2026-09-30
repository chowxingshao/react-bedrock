import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  // Vitest globals are off, so Testing Library's auto-cleanup is not registered: do it here.
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
